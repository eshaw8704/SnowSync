/* global jest */

jest.mock('@expo/vector-icons', () => {
  const Icon = () => null;
  return { MaterialCommunityIcons: Icon, Ionicons: Icon };
});
