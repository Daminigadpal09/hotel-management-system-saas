export const tenantFilter = (req) => {
  // For accountants, don't filter by hotelId to allow access to all billing records
  if (req.user.role === 'accountant') {
    return {};
  }
  return { hotelId: req.user.hotelId || req.user.id };
};

export const branchTenantFilter = (req) => {
  const query = { hotelId: req.user.hotelId || req.user.id };

  if (req.user.role === "BRANCH_MANAGER") {
    query.branchId = req.user.branchId;
  }

  return query;
};
