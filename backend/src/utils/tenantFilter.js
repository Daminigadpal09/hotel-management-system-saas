export const tenantFilter = (req) => {
  // For accountants and hotel owners, don't filter by hotelId to allow access to all billing records
  if (req.user.role === 'accountant' || req.user.role === 'hotel_owner' || req.user.role === 'HOTEL_OWNER' || req.user.role === 'owner' || req.user.role === 'super_admin') {
    console.log("DEBUG: Bypassing tenant filter for role:", req.user.role);
    return {};
  }
  console.log("DEBUG: Applying tenant filter for role:", req.user.role, "hotelId:", req.user.hotelId);
  return { hotelId: req.user.hotelId || req.user.id };
};

export const branchTenantFilter = (req) => {
  // For accountants and hotel owners, don't filter by hotelId to allow access to all billing records
  if (req.user.role === 'accountant' || req.user.role === 'hotel_owner' || req.user.role === 'HOTEL_OWNER' || req.user.role === 'owner' || req.user.role === 'super_admin') {
    console.log("DEBUG: Bypassing branch tenant filter for role:", req.user.role);
    return {};
  }
  
  console.log("DEBUG: Applying branch tenant filter for role:", req.user.role, "hotelId:", req.user.hotelId);
  const query = { hotelId: req.user.hotelId || req.user.id };

  if (req.user.role === "BRANCH_MANAGER") {
    query.branchId = req.user.branchId;
  }

  return query;
};
