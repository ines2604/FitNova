import { Animated } from "react-native";

export interface PaginatorProps {
    data: any[];
    scrollX: Animated.Value;
}

export interface NextButtonProps {
    scrollTo: () => void;
}

export interface OnBoardingscreenProps {
    item : {
        id : string;
        title : string;
        description : string;
        image : any;
    };
}