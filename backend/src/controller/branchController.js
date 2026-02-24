import BranchModel from "../model/BranchModel.js";

export const createBranch = async (req, res) => {
  const newBranch = await BranchModel.create({
    ...req.body,
    hotelId: req.user.hotelId
  });

  res.status(201).json(newBranch);
};

export const getBranches = async (req, res) => {
  const query = { hotelId: req.user.hotelId };

  if (req.user.role === "BRANCH_MANAGER") {
    query._id = req.user.branchId;
  }

  const branches = await BranchModel.find(query);
  res.json(branches);
};

export const getAllBranches = async (req, res) => {
  try {
    const branches = await BranchModel.find({}).populate('hotel_id', 'name');
    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
