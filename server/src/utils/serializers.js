function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, authToken, ...safe } = user;
  return safe;
}

function serializeOrder(order) {
  if (!order) return null;
  const { customer, rider, ...rest } = order;
  return {
    ...rest,
    customer: customer ? sanitizeUser(customer) : undefined,
    rider: rider ? sanitizeUser(rider) : null,
  };
}

module.exports = { sanitizeUser, serializeOrder };
