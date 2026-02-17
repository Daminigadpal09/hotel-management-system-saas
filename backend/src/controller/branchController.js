import Branch from "../model/Branch.js";

export const createBranch = async (req, res) => {
  const branch = await Branch.create({
    ...req.body,
    hotelId: req.user.hotelId
  });

  res.status(201).json(branch);
};

export const getBranches = async (req, res) => {
  const query = { hotelId: req.user.hotelId };

  if (req.user.role === "BRANCH_MANAGER") {
    query._id = req.user.branchId;
  }

  const branches = await Branch.find(query);
  res.json(branches);
};
