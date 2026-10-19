import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "@krizaka/ui/native";
import { nativeTheme } from "@krizaka/orochia-design-system/tokens";
import NewGroup from "@/app/messages/new-group";
import { setLocale } from "@/i18n";
import { AuthProvider } from "@/lib/auth";
import { clearToken, saveToken } from "@/lib/session";
import { answerFetch } from "@/test/api";
import { a11yProblems } from "@/test/a11y";
import { resetStorage } from "@/test/storage";

/** Creating a group from the phone (orochia#260): a name, contacts picked, POST /api/groups, then the conversation opens. */
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args), back: jest.fn(), canGoBack: jest.fn(() => true) },
  // The screen is focused once, when it shows: its effect runs once (its fetch answers later, outside the render).
  useFocusEffect: (effect: () => void) => {
    const { useRef } = jest.requireActual("react") as typeof import("react");
    const ran = useRef(false);
    if (!ran.current) {
      ran.current = true;
      effect();
    }
  },
}));
jest.mock("lucide-react-native", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-safe-area-context", () => (jest.requireActual("react-native-safe-area-context/jest/mock") as { default: unknown }).default);
jest.mock("@/lib/storage", () => jest.requireActual("@/test/storage"));

const contacts = [
  { id: "c1", userId: "11111111-1111-4111-8111-111111111111", username: "elenavox", displayName: "Elena Vox", avatarUrl: null, status: "ACCEPTED" },
  { id: "c2", userId: "22222222-2222-4222-8222-222222222222", username: "miasol", displayName: "Mia Sol", avatarUrl: null, status: "ACCEPTED" },
];
const themed = (node: React.ReactElement) => render(<ThemeProvider overrides={nativeTheme}><AuthProvider>{node}</AuthProvider></ThemeProvider>);

beforeEach(async () => {
  resetStorage();
  mockReplace.mockClear();
  setLocale("en");
  await clearToken();
  await saveToken("native-session");
});

describe("the new-group screen", () => {
  it("lists the contacts, makes the group with the picked ones and opens it", async () => {
    const { calls } = answerFetch({ "/api/auth/me": { user: null }, "/api/me/network": { contacts }, "/api/groups": { status: 201, body: { success: true, conversationId: "conv-1" } } });
    await themed(<NewGroup />);
    await fireEvent.changeText(await screen.findByLabelText("Group name"), "  Crew  ");
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Elena Vox, @elenavox" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Mia Sol, @miasol" }));
    await fireEvent.press(screen.getByRole("checkbox", { name: "Mia Sol, @miasol" })); // unpicked again
    await fireEvent.press(screen.getByRole("button", { name: "Create the group" }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/messages/conv-1"));
    const post = calls.find((c) => c.path === "/api/groups");
    expect(post?.method).toBe("POST");
    expect(post?.body).toEqual({ title: "Crew", memberIds: [contacts[0]!.userId] });
  });

  it("says what is missing and sends nothing", async () => {
    const { calls } = answerFetch({ "/api/auth/me": { user: null }, "/api/me/network": { contacts } });
    await themed(<NewGroup />);
    await screen.findByRole("checkbox", { name: "Elena Vox, @elenavox" });
    await fireEvent.press(screen.getByRole("button", { name: "Create the group" }));
    expect(await screen.findByText("Give the group a name.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Group name"), "Crew");
    await fireEvent.press(screen.getByRole("button", { name: "Create the group" }));
    expect(await screen.findByText("Pick at least one contact.")).toBeTruthy();
    expect(calls.some((c) => c.path === "/api/groups")).toBe(false);
  });

  it("tells the person when the group could not be made", async () => {
    answerFetch({ "/api/auth/me": { user: null }, "/api/me/network": { contacts }, "/api/groups": { status: 500, body: { error: "x" } } });
    await themed(<NewGroup />);
    await fireEvent.changeText(await screen.findByLabelText("Group name"), "Crew");
    await fireEvent.press(await screen.findByRole("checkbox", { name: "Elena Vox, @elenavox" }));
    await fireEvent.press(screen.getByRole("button", { name: "Create the group" }));
    expect(await screen.findByText("The group could not be created. Try again.")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("speaks French and passes the accessibility checks (44 pt targets, names, roles)", async () => {
    setLocale("fr");
    answerFetch({ "/api/auth/me": { user: null }, "/api/me/network": { contacts } });
    await themed(<NewGroup />);
    await screen.findByRole("button", { name: "Créer le groupe" });
    expect(screen.getByText("Nom du groupe")).toBeTruthy();
    expect(a11yProblems()).toEqual([]);
    setLocale("en");
  });

  it("is honest when there is nobody to add yet", async () => {
    answerFetch({ "/api/auth/me": { user: null }, "/api/me/network": { contacts: [] } });
    await themed(<NewGroup />);
    expect(await screen.findByText("You have no contacts yet. Add people from their profile first.")).toBeTruthy();
  });
});
