// Global Jest

jest.mock('@expo/vector-icons', () => {
  const Icon = () => null;
  return { materialCommunityIcons: Icon, Ionicons: Icon };
});
