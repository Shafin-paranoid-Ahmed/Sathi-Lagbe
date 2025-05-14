// src/components/FreeRooms.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Switch from 'react-switch';
import { motion, AnimatePresence } from 'framer-motion';

export default function FreeRooms() {
  const [useLabs, setUseLabs] = useState(false);
  const [data, setData]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const token = localStorage.getItem('token');
  const API   = import.meta.env.VITE_API_URL;

  // Fetch on toggle
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const url = `${API}/free/${useLabs ? 'labs' : 'classrooms'}`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [useLabs, token, API]);

  const days = ['Time/Day','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  return (
    <motion.div 
      className="p-6 bg-gray-900 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Toggle */}
        <motion.div 
          className="flex items-center justify-center space-x-2 text-gray-200"
          layout
          transition={{ duration: 0.3 }}
        >
          <span className="text-lg font-medium">Classrooms</span>
          <Switch
            onChange={() => setUseLabs(!useLabs)}
            checked={useLabs}
            offColor="#3b82f6"
            onColor="#f97316"
            uncheckedIcon={false}
            checkedIcon={false}
            height={24}
            width={48}
          />
          <span className="text-lg font-medium">Labs</span>
        </motion.div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-lg shadow-lg ring-1 ring-black ring-opacity-10">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                {days.map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-300 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <AnimatePresence>
              {loading ? (
                <motion.tbody
                  key="loading"
                  className="bg-gray-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                </motion.tbody>
              ) : error ? (
                <motion.tbody
                  key="error"
                  className="bg-gray-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                </motion.tbody>
              ) : (
                <motion.tbody
                  key="data"
                  className="bg-gray-700"
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { when: 'beforeChildren', staggerChildren: 0.05 } }
                  }}
                >
                  {data.map((row, i) => (
                    <motion.tr
                      key={i}
                      className={`${i % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600'}`}
                      variants={{
                        hidden: { opacity: 0, y: -10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      whileHover={{ scale: 1.02, backgroundColor: '#374151' }}
                    >
                      {days.map((h, j) => (
                        <td
                          key={j}
                          className="px-4 py-2 text-sm text-gray-200 align-top whitespace-nowrap"
                        >
                          {row[h] || '—'}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </motion.tbody>
              )}
            </AnimatePresence>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
