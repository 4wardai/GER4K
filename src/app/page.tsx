import Screen from "@/components/layout/Screen";
import HomeScreen from "@/components/home/HomeScreen";

/*
 * Home (Requirement 19): search-first mobility home. Client logic lives in
 * <HomeScreen>; this route stays a server component.
 */
export default function Home() {
  return (
    <Screen variant="full">
      <HomeScreen />
    </Screen>
  );
}
