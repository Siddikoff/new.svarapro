import { io } from "socket.io-client";
import { GameRoom } from "./pages/GameRoom";
import { AppRoot } from "@telegram-apps/telegram-ui";
import { SoundProvider } from "./context/SoundContext";
import { isMiniAppDark } from "@telegram-apps/sdk";
import { PositionsProvider } from "./context/PositionsContext";

const socket = io();

const AppTest = () => {
  const isDark = isMiniAppDark();

  return (
    <AppRoot appearance={isDark ? "dark" : "light"} platform="base">
      <SoundProvider>
        <PositionsProvider>
          <GameRoom
            roomId="1"
            balance="0.10"
            socket={socket}
            setCurrentPage={() => {}}
            userData={{
              id: "123123",
              username: "test username",
              first_name: "test first name",
              photo_url: "",
            }}
            pageData={{
              address: "address",
              trackerId: "trackerId",
              currency: "currency",
              roomId: "roomId",
            }}
          />
        </PositionsProvider>
      </SoundProvider>
    </AppRoot>
  );
};

export default AppTest;
