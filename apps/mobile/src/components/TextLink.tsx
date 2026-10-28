import { Link, type Href } from 'expo-router';
import { Pressable } from 'react-native';
import { sizes } from '../theme';
import { Text } from './Text';

export interface TextLinkProps {
  label: string;
  href: Href;
}

export function TextLink({ label, href }: TextLinkProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        style={{ minHeight: sizes.minTouchTargetIos, justifyContent: 'center' }}
      >
        <Text variant="label" color="brandGreen">
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}
