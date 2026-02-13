interface AuthState {
    isSignedIn: boolean;
    userName: string | null;
    userId: string | null;
}   


type AuthContext = {
    isSignedIn: boolean;
    userName: string | null;
    userId: string | null;
    refreshAuth: () => Promise<void>;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}