import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, logoutUser } from "../api/auth";
import { AuthContext } from "./auth-context";

const hasStoredToken = () => Boolean(localStorage.getItem("token"));

export function AuthProvider({ children }){
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(hasStoredToken);

    useEffect(()=>{
        if(!hasStoredToken()) return;

        let isMounted = true;

        getCurrentUser()
        .then((res)=>{
            if (isMounted) setUser(res.data);
        })
        .catch(()=> {
            if (isMounted) setUser(null);
        })
        .finally(()=> {
            if (isMounted) setLoading(false);
        });

        return () => {
            isMounted = false;
        };
    },[]);

    const logout = () =>{
        logoutUser();
        setUser(null);
        setLoading(false);
    };

    const value = useMemo(
        () => ({ user, setUser, logout, loading }),
        [user, loading],
    );

    return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
