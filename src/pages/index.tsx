import { useState, useEffect } from "react";
import { Button } from "@heroui/button";

import glassBreakSound from "./assets/glass-break-316720.mp3";

import DefaultLayout from "@/layouts/default";

interface AppointmentResponse {
  errorCode?: string;
  errorMessage?: string;
  lastModified?: string;
  appointmentTimestamps?: string[];
}

const notfallHilfeAufenthaltstitelUrl =
  "https://www48.muenchen.de/buergeransicht/api/backend/available-appointments?date=Invalid+date&officeId=10187259&serviceId=10339027&serviceCount=1";

// const notfallHilfeAufenthaltstitelUrl =
//   "https://www48.muenchen.de/buergeransicht/api/backend/available-appointments?date=2025-04-17&officeId=10238880&serviceId=1064381&serviceCount=1";

export default function IndexPage() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(180); // 3 minutes in seconds

  // Effect for automatic checking every 3 minutes
  useEffect(() => {
    // Initial check when the component mounts
    checkAppointments();

    // Set up an interval-to-decrement countdown every second
    const countdownInterval = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          // When countdown reaches 0, check appointments and reset countdown
          checkAppointments();

          return 180; // Reset to 3 minutes
        }

        return prevCountdown - 1;
      });
    }, 1000);

    // Clean up interval on component unmount
    return () => clearInterval(countdownInterval);
  }, []);

  // Function to format countdown time
  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  // Function to format date to Munich time (UTC+2)
  const formatToMunichTime = (dateString: string) => {
    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // Format to Munich time (UTC+2)
      return new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);

      return "Error formatting date";
    }
  };

  const checkAppointments = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Original URL
      const originalUrl = notfallHilfeAufenthaltstitelUrl;

      // List of CORS proxies to try (in order)
      const corsProxies = [
        "https://corsproxy.io/?",
        "https://cors-anywhere.herokuapp.com/",
        "https://api.allorigins.win/raw?url=",
      ];

      let response = null;
      let proxyError = null;

      // Try each proxy until one works
      for (const proxy of corsProxies) {
        const url = proxy + encodeURIComponent(originalUrl);

        try {
          response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "de,en-US;q=0.7,en;q=0.3",
              "X-Requested-With": "XMLHttpRequest",
            },
          });

          if (response.ok) {
            break; // Exit the loop if we get a successful response
          } else {
            proxyError = `Proxy returned status: ${response.status}`;
          }
        } catch (err: any) {
          proxyError = err.message;
          console.error(`Error with proxy ${proxy}:`, err);
        }
      }

      if (!response || !response.ok) {
        throw new Error(proxyError || "All proxies failed");
      }

      const data = await response.json();

      setResponse(data);

      if (data?.appointmentTimestamps?.length > 0) {
        document.title = "🔔 New Notification!";
        const audio = new Audio(glassBreakSound);

        audio.play();

        if (Notification.permission === "granted") {
          new Notification("You have a new message!");
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              new Notification("You have a new message!");
            }
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      setError(
        `Failed to fetch appointments: ${error.message}. This might be due to CORS restrictions. Please try again later or try using a browser extension that disables CORS.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <div className="flex flex-col w-full max-w-3xl mx-auto bg-default-50 rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">Проверка доступных записей</h2>

        <div className="flex items-center gap-4 mb-4">
          <Button
            color="primary"
            disabled={loading}
            onClick={checkAppointments}
          >
            {loading ? "Загрузка..." : "Проверить доступные записи"}
          </Button>

          <div className="text-sm bg-default-100 px-3 py-2 rounded-md">
            Следующая проверка через:{" "}
            <span className="font-bold">{formatCountdown(countdown)}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-danger-100 text-danger-700 rounded-lg mb-4">
            {error}
          </div>
        )}

        {response && (
          <div className="bg-default-100 p-4 rounded-lg">
            {response.errorCode ? (
              <div>
                <h3 className="font-bold text-lg mb-2">Ошибка:</h3>
                <p className="mb-2">{response.errorMessage}</p>
                {response.lastModified && (
                  <p className="text-sm text-default-500">
                    Последнее обновление:{" "}
                    {formatToMunichTime(response.lastModified)}
                  </p>
                )}
              </div>
            ) : response?.appointmentTimestamps &&
              response?.appointmentTimestamps?.length > 0 ? (
              <div>
                <h3 className="font-bold text-lg mb-2">Доступные записи:</h3>
                <ul className="space-y-2">
                  {response?.appointmentTimestamps.map((timestamp, index) => (
                    <li key={index} className="p-2 bg-default-200 rounded">
                      {formatToMunichTime(timestamp)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Нет доступных записей.</p>
            )}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}
