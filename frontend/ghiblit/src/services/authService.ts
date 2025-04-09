import api from './api'; // Your configured Axios instance

interface GoogleLoginResponse {
    access: string;
    refresh: string;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
        profile: {
            credit_balance: number;
            free_transform_used: boolean;
        };
    };
}

// Define the structure of the user profile response
interface UserProfileResponse {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile: {
        credit_balance: number;
        free_transform_used: boolean;
    };
}


const authService = {
    // Google Login
    googleLogin: async (idToken: string): Promise<GoogleLoginResponse> => {
        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.post<GoogleLoginResponse>('google-login/', {
                id_token: idToken,
            });
            console.log("authService: Google login API success:", response.data); // Debug log
            return response.data;
        } catch (error: any) {
            console.error("authService: Google login API error:", error.response?.data || error.message); // Log specific error
            throw error; // Re-throw the error to be handled by the caller
        }
    },

    // Fetch user profile
    getProfile: async (): Promise<UserProfileResponse> => {
        try {
            // --- FIX: Removed leading /api/ ---
            const response = await api.get<UserProfileResponse>('profile/');
            // console.log("authService: Profile fetched:", response.data); // Debug log
            return response.data;
        } catch (error: any) {
            console.error("authService: Get profile API error:", error.response?.data || error.message); // Log specific error
            throw error;
        }
    },

    // --- Example: Add logout if needed ---
    // logout: async (): Promise<void> => {
    //    const refreshToken = localStorage.getItem('refresh_token');
    //    if (!refreshToken) return; // No need to call backend if no refresh token
    //    try {
    //        // --- FIX: Removed leading /api/ ---
    //        await api.post('logout/', { refresh_token: refreshToken });
    //    } catch (error) {
    //        console.error("Logout API error:", error);
    //        // Decide how to handle logout errors, maybe ignore?
    //    }
    //},
};

export default authService;