import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import VakilAvatar from "../components/VakilAvatar";
import { VAKIL_AVATAR } from "../config/avatarAssets";

afterEach(() => { cleanup(); vi.useRealTimers(); });

test("static portrait never swaps mouth or blink frames while talking; speaking state is the CSS class only", () => {
  vi.useFakeTimers();
  const ui = render(<VakilAvatar talking />);
  const img = screen.getByAltText(VAKIL_AVATAR.label);
  expect(img.getAttribute("src")).toBe(VAKIL_AVATAR.frames.idle);
  act(() => vi.advanceTimersByTime(10000));
  expect(img.getAttribute("src")).toBe(VAKIL_AVATAR.frames.idle);
  expect(img.parentElement.classList.contains("is-talking")).toBe(true);
  ui.rerender(<VakilAvatar talking={false} />);
  expect(img.parentElement.classList.contains("is-talking")).toBe(false);
  expect(img.getAttribute("src")).toBe(VAKIL_AVATAR.frames.idle);
});
