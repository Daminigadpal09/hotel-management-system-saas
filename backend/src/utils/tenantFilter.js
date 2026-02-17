export const tenantFilter = (req) => {
  return { hotelId: req.user.hotelId };
};

export const branchTenantFilter = (req) => {
  const query = { hotelId: req.user.hotelId };

  if (req.user.role === "BRANCH_MANAGER") {
    query.branchId = req.user.branchId;
  }

  return query;
};
