// Generates a short, readable Swish reference code
// Format: VK4-XXXX (VK4 = Viekärrsvägen 4, XXXX = random alphanumeric)
export function generateSwishReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `VK4-${code}`;
}
