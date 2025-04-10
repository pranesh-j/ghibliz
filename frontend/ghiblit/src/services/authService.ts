import api from './api';

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
    googleLogin: async (idToken: string): Promise<GoogleLoginResponse> => {
        try {
            const response = await api.post<GoogleLoginResponse>('api/google-login/', {
                id_token: idToken,
            });
            console.log("authService: Google login API success:", response.data);
            return response.data;
        } catch (error: any) {
            console.error("authService: Google login API error:", error.response?.data || error.message);
            throw error;
        }
    },

    getProfile: async (): Promise<UserProfileResponse> => {
        try {
            const response = await api.get<UserProfileResponse>('api/profile/');
            return response.data;
        } catch (error: any) {
            console.error("authService: Get profile API error:", error.response?.data || error.message);
            throw error;
        }
    },
};

export default authService;