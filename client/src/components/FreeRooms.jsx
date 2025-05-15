// client/src/components/FreeRooms.jsx
import { useEffect, useState } from 'react';
import { getFreeClassrooms, getFreeLabs } from '../api/friends';
import Switch from 'react-switch';

export default function FreeRooms() {
  const [useLabs, setUseLabs] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch on toggle
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError('');
      try {
        const res = useLabs 
          ? await getFreeLabs() 
          : await getFreeClassrooms();
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRooms();
  }, [useLabs]);

  const days = ['Time/Day', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-center space-x-2 text-gray-700 dark:text-gray-200">
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
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-lg shadow-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                {days.map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-red-500 dark:text-red-400">
                    {error}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500 dark:text-gray-400">
                    No {useLabs ? 'labs' : 'classrooms'} available.
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr 
                    key={i} 
                    className={`${i % 2 === 0 ? 'bg-white dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-600'} hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors`}
                  >
                    {days.map((day, j) => (
                      <td
                        key={j}
                        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 align-top whitespace-nowrap"
                      >
                        {row[day] || '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}