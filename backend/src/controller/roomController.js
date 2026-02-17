import Room from "../model/Room.js";
import { branchTenantFilter } from "../utils/tenantFilter.js";


export const createRoom = async (req, res) => {
  const room = await Room.create({
    ...req.body,
    hotelId: req.user.hotelId
  });

  res.status(201).json(room);
};
// GET ROOMS (Multi-tenant + Branch isolation)
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find(branchTenantFilter(req));
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};