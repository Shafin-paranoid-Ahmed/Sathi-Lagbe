// server/controllers/classroomController.js - Enhanced with Module 3 features
const Classroom = require('../models/Classroom');

/**
 * Get all available classrooms
 */
exports.getAvailableClassrooms = async (req, res) => {
  try {
    const rooms = await Classroom.find({ status: 'Available' });
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching available classrooms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch classrooms' });
  }
};

/**
 * Update classroom status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ error: 'ID and status are required' });
    }
    
    if (!['Available', 'Occupied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either Available or Occupied' });
    }
    
    const room = await Classroom.findById(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    
    room.status = status;
    room.updatedAt = Date.now();
    
    await room.save();
    
    res.json(room);
  } catch (err) {
    console.error('Error updating classroom status:', err);
    res.status(500).json({ error: err.message || 'Failed to update status' });
  }
};

/**
 * Get all classrooms
 */
exports.getAllClassrooms = async (req, res) => {
  try {
    const rooms = await Classroom.find();
    res.json(rooms);
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch classrooms' });
  }
};

/**
 * Set all classrooms to available
 */
exports.setAllClassroomsAvailable = async (req, res) => {
    try {
        await Classroom.updateMany({}, { status: 'Available', updatedAt: Date.now() });
        res.json({ message: 'All classrooms have been set to "Available".' });
    } catch (err) {
        console.error('Error setting all classrooms to available:', err);
        res.status(500).json({ error: err.message || 'Failed to update classrooms' });
    }
};

// ========== MODULE 3: Enhanced Classroom Availability System ==========

/**
 * Get classrooms with advanced filtering (Module 3)
 */
exports.getFilteredClassrooms = async (req, res) => {
  try {
    const { 
      floor, 
      minCapacity, 
      maxCapacity, 
      building, 
      roomType, 
      timeSlot, 
      day,
      facilities,
      status 
    } = req.query;

    let query = { isActive: true };

    // Floor filtering
    if (floor) {
      query.floor = parseInt(floor);
    }

    // Capacity range filtering
    if (minCapacity || maxCapacity) {
      query.capacity = {};
      if (minCapacity) query.capacity.$gte = parseInt(minCapacity);
      if (maxCapacity) query.capacity.$lte = parseInt(maxCapacity);
    }

    // Building filtering
    if (building) {
      query.building = new RegExp(building, 'i');
    }

    // Room type filtering
    if (roomType) {
      query.roomType = roomType;
    }

    // Status filtering
    if (status) {
      query.status = status;
    }

    // Facilities filtering
    if (facilities) {
      const facilityArray = facilities.split(',').map(f => f.trim());
      query.facilities = { $all: facilityArray };
    }

    let rooms = await Classroom.find(query).sort({ building: 1, floor: 1, roomNumber: 1 });

    // Time-based availability filtering (Module 3)
    if (timeSlot && day) {
      rooms = rooms.filter(room => {
        const daySchedule = room.timetable?.schedule?.[day.toLowerCase()] || [];
        const slot = daySchedule.find(s => s.timeSlot === timeSlot);
        return slot && !slot.isOccupied;
      });
    }

    res.json({
      classrooms: rooms,
      filters: {
        floor,
        minCapacity,
        maxCapacity,
        building,
        roomType,
        timeSlot,
        day,
        facilities,
        status
      },
      total: rooms.length
    });
  } catch (err) {
    console.error('Error fetching filtered classrooms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch classrooms' });
  }
};

/**
 * Update classroom timetable (Module 3)
 */
exports.updateTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { timetable } = req.body;

    if (!timetable || !timetable.schedule) {
      return res.status(400).json({ error: 'Timetable schedule is required' });
    }

    const room = await Classroom.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    room.timetable = {
      ...room.timetable,
      ...timetable,
      lastUpdated: new Date()
    };

    await room.save();
    res.json(room);
  } catch (err) {
    console.error('Error updating classroom timetable:', err);
    res.status(500).json({ error: err.message || 'Failed to update timetable' });
  }
};

/**
 * Get classroom availability for specific timeslot (Module 3)
 */
exports.getAvailabilityForTimeslot = async (req, res) => {
  try {
    const { day, timeSlot, building, floor } = req.query;

    if (!day || !timeSlot) {
      return res.status(400).json({ error: 'Day and timeSlot are required' });
    }

    let query = { 
      isActive: true,
      [`timetable.schedule.${day.toLowerCase()}`]: { $exists: true }
    };

    if (building) query.building = new RegExp(building, 'i');
    if (floor) query.floor = parseInt(floor);

    const rooms = await Classroom.find(query);

    const availableRooms = rooms.filter(room => {
      const daySchedule = room.timetable?.schedule?.[day.toLowerCase()] || [];
      const slot = daySchedule.find(s => s.timeSlot === timeSlot);
      return slot && !slot.isOccupied;
    });

    res.json({
      day,
      timeSlot,
      availableRooms,
      totalAvailable: availableRooms.length,
      totalRooms: rooms.length
    });
  } catch (err) {
    console.error('Error fetching availability for timeslot:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch availability' });
  }
};

/**
 * Bulk update classroom timetables from university data (Module 3)
 */
exports.bulkUpdateTimetables = async (req, res) => {
  try {
    const { timetables } = req.body;

    if (!timetables || !Array.isArray(timetables)) {
      return res.status(400).json({ error: 'Timetables array is required' });
    }

    const updatePromises = timetables.map(async (item) => {
      const { roomId, timetable } = item;
      return Classroom.findByIdAndUpdate(
        roomId,
        { 
          timetable: {
            ...timetable,
            lastUpdated: new Date()
          }
        },
        { new: true }
      );
    });

    const updatedRooms = await Promise.all(updatePromises);
    const validRooms = updatedRooms.filter(room => room !== null);

    res.json({
      message: `Successfully updated ${validRooms.length} classroom timetables`,
      updatedRooms: validRooms
    });
  } catch (err) {
    console.error('Error bulk updating timetables:', err);
    res.status(500).json({ error: err.message || 'Failed to update timetables' });
  }
};

/**
 * Get classroom statistics (Module 3)
 */
exports.getClassroomStats = async (req, res) => {
  try {
    const { building, floor } = req.query;

    let query = { isActive: true };
    if (building) query.building = new RegExp(building, 'i');
    if (floor) query.floor = parseInt(floor);

    const rooms = await Classroom.find(query);

    const stats = {
      total: rooms.length,
      byStatus: {
        available: rooms.filter(r => r.status === 'Available').length,
        occupied: rooms.filter(r => r.status === 'Occupied').length
      },
      byFloor: {},
      byBuilding: {},
      byCapacity: {
        small: rooms.filter(r => r.capacity < 30).length,
        medium: rooms.filter(r => r.capacity >= 30 && r.capacity < 60).length,
        large: rooms.filter(r => r.capacity >= 60).length
      },
      byType: {}
    };

    // Floor statistics
    rooms.forEach(room => {
      if (!stats.byFloor[room.floor]) stats.byFloor[room.floor] = 0;
      stats.byFloor[room.floor]++;
    });

    // Building statistics
    rooms.forEach(room => {
      if (!stats.byBuilding[room.building]) stats.byBuilding[room.building] = 0;
      stats.byBuilding[room.building]++;
    });

    // Room type statistics
    rooms.forEach(room => {
      if (!stats.byType[room.roomType]) stats.byType[room.roomType] = 0;
      stats.byType[room.roomType]++;
    });

    res.json(stats);
  } catch (err) {
    console.error('Error fetching classroom statistics:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch statistics' });
  }
};
