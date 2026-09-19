export function createRooms() {
  const snapshots = new Map();
  return {
    update(roomId, projection) {
      if (!roomId) return;
      snapshots.set(roomId, projection);
    },
    get(roomId) {
      return snapshots.get(roomId);
    },
    drop(roomId) {
      snapshots.delete(roomId);
    },
  };
}
