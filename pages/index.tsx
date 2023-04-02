import { Button } from "@chakra-ui/react";
import type { Liff } from "@line/liff";
import {
  useAddress,
  useLogin,
  useLogout,
  useMetamask,
  useUser,
} from "@thirdweb-dev/react";
import type { NextPage } from "next";
import { useEffect, useState } from "react";

const Home: NextPage<{ liff: Liff | null; liffError: string | null }> = ({
  liff,
  liffError,
}) => {
  const address = useAddress();
  const connect = useMetamask();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { user, isLoggedIn } = useUser();
  const [secret, setSecret] = useState();
  const [idToken, setIdToken] = useState("");

  useEffect(() => {
    if (!liff) return;
    const fn = async () => {
      if (!liff.isLoggedIn()) {
        liff.login();
      }
      const idToken = liff.getIDToken();
      setIdToken(idToken!);
    };
    fn();
  }, [liff]);

  const setWallet = async () => {
    const res = await fetch("/api/registerWallet", {
      method: "POST",
      body: JSON.stringify({
        idToken: idToken,
      }),
    });
    const data = await res.json();
    setSecret(data.message);
  };

  return (
    <div>
      {liff ? (
        <>
          {isLoggedIn ? (
            <Button onClick={() => logout()}>Logout</Button>
          ) : address ? (
            <Button onClick={() => login()}>Login</Button>
          ) : (
            <Button onClick={() => connect()}>Connect</Button>
          )}
          <Button onClick={setWallet}>Set Wallet</Button>

          <pre>Connected Wallet: {address}</pre>
          <pre>User: {JSON.stringify(user, undefined, 2) || "N/A"}</pre>
        </>
      ) : (
        <>...loading</>
      )}
      {liffError && (
        <>
          <p>LIFF init failed.</p>
          <p>
            <code>{liffError}</code>
          </p>
        </>
      )}
    </div>
  );
};

export default Home;
