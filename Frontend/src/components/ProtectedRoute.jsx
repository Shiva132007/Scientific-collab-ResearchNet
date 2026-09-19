import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }){
    const { user , loading} = useAuth();

    if(loading) return <p className="route-loading">Loading workspace...</p>
    if(!user) return <Navigate to="/login" replace />;

    return children;
}
