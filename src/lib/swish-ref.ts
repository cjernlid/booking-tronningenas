// Generates a readable Swish reference based on booking dates
// Format: VK4_d/m-d/m (e.g. VK4_2/4-4/4)
export function generateSwishReference(checkIn: string, checkOut: string): string {
  const start = new Date(checkIn + 'T12:00:00');
  const end = new Date(checkOut + 'T12:00:00');
  const from = `${start.getDate()}/${start.getMonth() + 1}`;
  const to = `${end.getDate()}/${end.getMonth() + 1}`;
  return `VK4_${from}-${to}`;
}
