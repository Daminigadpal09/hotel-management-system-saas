import Hotel from "../model/Hotel.js";

export const createHotel = async (req, res) => {
  const hotel = await Hotel.create(req.body);
  res.status(201).json(hotel);
};

export const getHotels = async (req, res) => {
  const hotels = await Hotel.find();
  res.json(hotels);
};
