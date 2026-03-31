// utils/roomUtils.js
export const generateRoomId = (userId1, userId2) => {
  // Sort to ensure consistent roomId regardless of order
  return [userId1, userId2].sort().join("_");
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
};