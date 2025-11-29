import { useEffect, useState, useMemo, useCallback } from "react";
import { isMiniAppDark, retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { AppRoot } from "@telegram-apps/telegram-ui";
import { Socket } from "socket.io-client";
import { initSocket } from "./services/websocket";
import { Dashboard } from "./pages/Dashboard";
import { Deposit } from "./pages/Deposit";
import { ConfirmDeposit } from "./pages/ConfirmDeposit";
import { Withdraw } from "./pages/Withdraw";
import { ConfirmWithdraw } from "./pages/ConfirmWithdraw";
import { AddWallet } from "./pages/AddWallet";
import { More } from "./pages/More";
import { DepositHistory } from "./pages/DepositHistory";
import { GameRoom } from "./pages/GameRoom";
import { PopSuccess } from "./components/PopSuccess";
import { initTelegramSdk } from "./utils/init";
import { apiService } from "./services/api/api";
import axios from "axios";
import { ErrorAlert } from "./components/ErrorAlert";
import { useAppBackButton } from "./hooks/useAppBackButton";
import { useAppUpdate } from "./hooks/useAppUpdate";
import { SoundProvider } from "./context/SoundContext";
import { Notification } from "./components/Notification";
import { NotificationType } from "./types/components";
import { PositionsProvider } from "./context/PositionsContext";

import { TurnPhoneOver } from "./components/TurnPhoneOver";

interface LaunchParams {
  initData?: string;
  tgWebAppData?: Record<string, string | Record<string, unknown>>;
  startPayload?: string;
}

type ApiError =
  | {
      message?: string;
      response?: {
        data?: unknown;
        status?: number;
      };
    }
  | string;

type PageData = {
  address?: string;
  trackerId?: string;
  currency?: string;
  roomId?: string;
  [key: string]: unknown;
};

type UserData = {
  id?: number | string;
  username?: string;
  first_name?: string;
  photo_url?: string;
};

interface UserProfile {
  id?: number;
  telegramId?: string;
  username?: string;
  avatar?: string | null;
  balance?: string | number;
  walletAddress?: string | null;
}

function isErrorResponse(data: unknown): data is { message: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as { message: string }).message === "string"
  );
}

type Page =
  | "dashboard"
  | "more"
  | "deposit"
  | "confirmDeposit"
  | "withdraw"
  | "confirmWithdraw"
  | "addWallet"
  | "depositHistory"
  | "gameRoom";

function App() {
  const isDark = isMiniAppDark();
  const [error, setError] = useState<string | null>(null);
  const [isSdkInitialized, setIsSdkInitialized] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(
    null
  );
  const [isPhoneVertical, setIsPhoneVertical] = useState(false);

  useEffect(() => {

    if (window.innerWidth >= window.innerHeight) {
      setIsPhoneVertical(false);
    } else {
      setIsPhoneVertical(true);
    }

    window.addEventListener('resize', () => {
      console.log(window.innerWidth, window.innerHeight);
      if (window.innerWidth >= window.innerHeight) {
        setIsPhoneVertical(false);
      } else {
        setIsPhoneVertical(true);
      }
    })
  }, [])

  const { updateAvailable, updateApp } = useAppUpdate();

  const handleBack = useCallback(() => {
    if (
      currentPage === "more" ||
      currentPage === "deposit" ||
      currentPage === "withdraw" ||
      currentPage === "addWallet" ||
      currentPage === "depositHistory" ||
      currentPage === "gameRoom"
    ) {
      setCurrentPage("dashboard");
    } else if (currentPage === "confirmDeposit") {
      setCurrentPage("deposit");
    } else if (currentPage === "confirmWithdraw") {
      setCurrentPage("withdraw");
    }
  }, [currentPage]);

  useAppBackButton(isSdkInitialized && currentPage !== "dashboard", handleBack);

  const userData = useMemo(() => {
    const params = retrieveLaunchParams() as LaunchParams;
    return (params.tgWebAppData as { user?: UserData })?.user || {};
  }, []);

  const handleSetCurrentPage = (page: Page, data: PageData | null = null) => {
    setCurrentPage(page);
    setPageData(data);
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await initTelegramSdk();
        setIsSdkInitialized(true);
      } catch (e) {
        console.error("Failed to initialize SDK:", e);
        setError("Failed to initialize Telegram SDK");
      }

      const launchParams = retrieveLaunchParams() as LaunchParams;

      let initData: string | undefined = launchParams.initData;
      if (!initData && launchParams.tgWebAppData) {
        initData = new URLSearchParams(
          Object.entries(launchParams.tgWebAppData)
            .filter(([key]) => key !== "hash" && key !== "signature")
            .map(([key, value]) => {
              if (typeof value === "object" && value !== null) {
                return [key, JSON.stringify(value)];
              }
              return [key, value.toString()];
            })
        ).toString();
      }

      const loadData = async () => {
        if (!initData) {
          setError("Telegram initialization data not found.");
          return;
        }

        try {
          let roomIdFromPayload: string | undefined = undefined;
          let referrerIdFromPayload: string | undefined = undefined;

          if (
            launchParams.startPayload &&
            launchParams.startPayload.startsWith("join_")
          ) {
            const parts = launchParams.startPayload.split("_");
            if (parts.length > 2) {
              // join_roomId_referrerId
              roomIdFromPayload = parts[1];
              referrerIdFromPayload = parts[2];
            }
          } else if (launchParams.startPayload) {
            referrerIdFromPayload = launchParams.startPayload;
          }

          await apiService.login(initData, referrerIdFromPayload);

          const profile = (await apiService.getProfile()) as UserProfile;
          setBalance(
            profile.balance !== undefined
              ? typeof profile.balance === "number"
                ? profile.balance.toFixed(2)
                : parseFloat(profile.balance).toFixed(2)
              : "0.00"
          );
          setWalletAddress(profile.walletAddress || null);

          if (roomIdFromPayload) {
            try {
              await apiService.joinRoom(roomIdFromPayload);
              handleSetCurrentPage("gameRoom", {
                roomId: roomIdFromPayload,
                autoSit: true,
              });
            } catch (error) {
              let errorMessage = "";
              if (
                axios.isAxiosError(error) &&
                isErrorResponse(error.response?.data)
              ) {
                errorMessage = error.response.data.message;
              }

              if (
                errorMessage.toLowerCase().includes("insufficient") ||
                errorMessage.toLowerCase().includes("funds")
              ) {
                handleSetCurrentPage("deposit");
              } else {
                console.error("Failed to join room:", error);
                setCurrentPage("dashboard");
                setNotification("gameJoinError");
              }
            }
          }

          // Создаем единое WebSocket соединение
          if (!socket) {
            const socketInstance = initSocket(profile.telegramId, {
              username: profile.username || 'Unknown',
              photo_url: profile.avatar || '',
            });
            setSocket(socketInstance);

            // Добавляем обработчики для баланса
            const handleBalanceUpdate = (event: CustomEvent) => {
              setBalance(event.detail.balance);
              if (event.detail.message) {
                setSuccessMessage(event.detail.message);
              }
            };

            window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);

            // Очистка обработчика при размонтировании
            return () => {
              window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
            };
          }
        } catch (error) {
          const apiError = error as ApiError;
          const errorMessage =
            typeof apiError === "string"
              ? apiError
              : apiError.message || "Unknown error";
          console.error(
            "Login error:",
            errorMessage,
            typeof apiError === "object" && apiError.response
              ? apiError.response.data
              : "No response data"
          );
          setError("Failed to load data. Please try again later.");
         
        }
      };

      await loadData();
    };

    initialize();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <AppRoot className="overflow-x-hidden" appearance={isDark ? "dark" : "light"} platform="base">
      <SoundProvider>
        {/* Уведомление об обновлении приложения */}
        {updateAvailable && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 text-center">
            <span className="mr-2">Доступно обновление приложения</span>
            <button
              onClick={updateApp}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
            >
              Обновить
            </button>
          </div>
        )}
        {
        !isPhoneVertical &&
          <TurnPhoneOver/>
        }
        {error ? (
          <ErrorAlert code={undefined} customMessage={error} />
        ) 
         : currentPage === "more" ? (
          <More userData={userData} setCurrentPage={handleSetCurrentPage} />
        ) : currentPage === "deposit" ? (
          <Deposit setCurrentPage={handleSetCurrentPage} />
        ) : currentPage === "confirmDeposit" &&
          pageData &&
          pageData.address &&
          pageData.trackerId ? (
          <ConfirmDeposit
            address={pageData.address}
            currency={pageData.currency ?? "USDTTON"}
            trackerId={pageData.trackerId}
          />
        ) : currentPage === "withdraw" ? (
          <Withdraw
            balance={balance}
            setCurrentPage={handleSetCurrentPage}
            setWithdrawAmount={setWithdrawAmount}
          />
        ) : currentPage === "confirmWithdraw" ? (
          <ConfirmWithdraw
            withdrawAmount={withdrawAmount}
            walletAddress={walletAddress || ""}
          />
        ) : currentPage === "addWallet" ? (
          <AddWallet
            setCurrentPage={handleSetCurrentPage}
            setWalletAddress={setWalletAddress}
          />
        ) : currentPage === "depositHistory" ? (
          <DepositHistory
            setCurrentPage={handleSetCurrentPage}
            userId={String(userData.id)}
          />
        ) : currentPage === "gameRoom" && pageData && pageData.roomId ? (
          <PositionsProvider>
            <GameRoom
              roomId={pageData.roomId}
              balance={balance}
              socket={socket}
              setCurrentPage={handleSetCurrentPage}
              userData={userData}
              pageData={pageData}
            />
          </PositionsProvider>
        ) : (
          <Dashboard
            onMoreClick={() => handleSetCurrentPage("more")}
            setCurrentPage={handleSetCurrentPage}
            balance={balance}
            walletAddress={walletAddress}
            socket={socket}
          />
        )}
        {successMessage && (
          <PopSuccess
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
          />
        )}
        {notification && (
          <Notification
            type={notification}
            onClose={() => setNotification(null)}
          />
        )}
      </SoundProvider>
    </AppRoot>
  );
}

export default App;
