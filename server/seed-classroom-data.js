// server/seed-classroom-data.js - Module 3 Sample Data Seeder
const mongoose = require('mongoose');
require('dotenv').config();

const Classroom = require('./models/Classroom');

// Sample classroom data with Module 3 features
const sampleClassrooms = [
  {
    roomNumber: '101',
    building: 'Building A',
    floor: 1,
    capacity: 30,
    status: 'Available',
    roomType: 'Classroom',
    facilities: ['Projector', 'AC', 'Whiteboard'],
    timetable: {
      schedule: {
        sunday: [
          { timeSlot: '08:00-09:20', course: 'CSE341-02-SBAW-10A-04C', isOccupied: true },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: 'CSE321-14-ZMD-09F-25L', isOccupied: true },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        monday: [
          { timeSlot: '08:00-09:20', course: 'CSE341-02-SBAW-10A-04C', isOccupied: true },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: 'CSE460-02-UPM-10E-27L', isOccupied: true },
          { timeSlot: '03:30-04:50', course: 'CSE460-02-UPM-10E-27L', isOccupied: true },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        tuesday: [
          { timeSlot: '08:00-09:20', course: 'CSE341-02-SBAW-12F-31L', isOccupied: true },
          { timeSlot: '09:30-10:50', course: 'CSE341-02-SBAW-12F-31L', isOccupied: true },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: 'CSE321-14-ZMD-09D-18C', isOccupied: true },
          { timeSlot: '02:00-03:20', course: 'CSE460-02-UPM-09D-17C', isOccupied: true },
          { timeSlot: '03:30-04:50', course: 'CSE471-08-TBA-08H-22C', isOccupied: true },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        wednesday: [
          { timeSlot: '08:00-09:20', course: 'CSE341-02-SBAW-10A-04C', isOccupied: true },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: 'CSE321-14-ZMD-09F-25L', isOccupied: true },
          { timeSlot: '12:30-01:50', course: 'CSE321-14-ZMD-09F-25L', isOccupied: true },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        thursday: [
          { timeSlot: '08:00-09:20', course: 'CSE471-08-TBA-09E-22L', isOccupied: true },
          { timeSlot: '09:30-10:50', course: 'CSE471-08-TBA-09E-22L', isOccupied: true },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        friday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        saturday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ]
      },
      lastUpdated: new Date()
    }
  },
  {
    roomNumber: '102',
    building: 'Building A',
    floor: 1,
    capacity: 45,
    status: 'Available',
    roomType: 'Classroom',
    facilities: ['Projector', 'AC', 'Whiteboard', 'Sound System'],
    timetable: {
      schedule: {
        sunday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        monday: [
          { timeSlot: '08:00-09:20', course: 'CSE341-02-SBAW-10A-04C', isOccupied: true },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        tuesday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        wednesday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        thursday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        friday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        saturday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ]
      },
      lastUpdated: new Date()
    }
  },
  {
    roomNumber: '201',
    building: 'Building A',
    floor: 2,
    capacity: 60,
    status: 'Occupied',
    roomType: 'Lab',
    facilities: ['Computer', 'Projector', 'AC', 'Whiteboard'],
    timetable: {
      schedule: {
        sunday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        monday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        tuesday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        wednesday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        thursday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        friday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        saturday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ]
      },
      lastUpdated: new Date()
    }
  },
  {
    roomNumber: '301',
    building: 'Building B',
    floor: 3,
    capacity: 80,
    status: 'Available',
    roomType: 'Conference',
    facilities: ['Projector', 'AC', 'Whiteboard', 'Sound System', 'Video Conference'],
    timetable: {
      schedule: {
        sunday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        monday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        tuesday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        wednesday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        thursday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        friday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ],
        saturday: [
          { timeSlot: '08:00-09:20', course: '', isOccupied: false },
          { timeSlot: '09:30-10:50', course: '', isOccupied: false },
          { timeSlot: '11:00-12:20', course: '', isOccupied: false },
          { timeSlot: '12:30-01:50', course: '', isOccupied: false },
          { timeSlot: '02:00-03:20', course: '', isOccupied: false },
          { timeSlot: '03:30-04:50', course: '', isOccupied: false },
          { timeSlot: '05:00-06:20', course: '', isOccupied: false }
        ]
      },
      lastUpdated: new Date()
    }
  }
];

async function seedClassroomData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing classroom data
    await Classroom.deleteMany({});
    console.log('Cleared existing classroom data');

    // Insert sample data
    const insertedClassrooms = await Classroom.insertMany(sampleClassrooms);
    console.log(`Successfully inserted ${insertedClassrooms.length} classrooms`);

    // Display summary
    console.log('\n=== Module 3 Classroom Data Summary ===');
    console.log(`Total classrooms: ${insertedClassrooms.length}`);
    
    const byBuilding = {};
    const byFloor = {};
    const byType = {};
    
    insertedClassrooms.forEach(room => {
      byBuilding[room.building] = (byBuilding[room.building] || 0) + 1;
      byFloor[room.floor] = (byFloor[room.floor] || 0) + 1;
      byType[room.roomType] = (byType[room.roomType] || 0) + 1;
    });

    console.log('\nBy Building:');
    Object.entries(byBuilding).forEach(([building, count]) => {
      console.log(`  ${building}: ${count} rooms`);
    });

    console.log('\nBy Floor:');
    Object.entries(byFloor).forEach(([floor, count]) => {
      console.log(`  Floor ${floor}: ${count} rooms`);
    });

    console.log('\nBy Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} rooms`);
    });

    console.log('\n✅ Module 3 classroom data seeded successfully!');
    console.log('🎯 Features available:');
    console.log('  - University timetable integration');
    console.log('  - Floor-based filtering');
    console.log('  - Capacity range filtering');
    console.log('  - Time-based availability checking');
    console.log('  - Advanced statistics');

  } catch (error) {
    console.error('Error seeding classroom data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedClassroomData();
}

module.exports = { seedClassroomData };
