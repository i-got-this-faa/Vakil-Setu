import { draftBundles } from '../draft-bundles';
import type { Messages } from '../types';

/** Compatibility export backed by the same draft bundle as getMessages(). */
export const enMessages: Messages = draftBundles.en.sharedMessages;
