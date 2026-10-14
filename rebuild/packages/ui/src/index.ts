/**
 * @vakil/ui
 * Accessible shadcn-style component library for Vakil Setu web applications.
 * Built with Radix Primitives and Tailwind CSS v4.
 */

export { cn } from './lib/utils';

export {
  Button,
  buttonVariants,
  type ButtonProps,
} from './components/button';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  type CardProps,
  type CardHeaderProps,
  type CardFooterProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
} from './components/card';

export {
  Input,
  type InputProps,
} from './components/input';

export {
  Textarea,
  type TextareaProps,
} from './components/textarea';

export {
  Badge,
  badgeVariants,
  type BadgeProps,
} from './components/badge';

export {
  Label,
  labelVariants,
  type LabelProps,
} from './components/label';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  type SelectTriggerProps,
  type SelectScrollUpButtonProps,
  type SelectScrollDownButtonProps,
  type SelectContentProps,
  type SelectLabelProps,
  type SelectItemProps,
  type SelectSeparatorProps,
} from './components/select';
