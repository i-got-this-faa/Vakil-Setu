import { Component, type ReactNode } from "react";
import { Button, Notice, Screen } from "./ui";
import { GENERIC_REQUEST_FAILURE } from "../lib/errors";

type State = { failed: boolean };

/**
 * Convex hooks throw on failed queries. This boundary keeps the app usable: it shows a
 * truthful message and lets the user retry rendering, rather than leaving a blank screen.
 */
export class DataErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <Screen>
          <Notice tone="error">{GENERIC_REQUEST_FAILURE}</Notice>
          <Button label="Try again" onPress={() => this.setState({ failed: false })} />
        </Screen>
      );
    }
    return this.props.children;
  }
}
