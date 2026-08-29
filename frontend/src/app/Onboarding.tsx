import { View, FlatList, Animated, ViewToken } from "react-native";
import React, { useRef, useState } from "react";
import slides from "@/utils/slides";
import OnboardingItem from "@/components/OnboardingItem";
import Paginator from "@/components/Paginator";
import NextButton from "@/components/NextButton";
import { useRouter } from "expo-router";

interface Slides {
    id: string;
    title: string;
    description: string;
    image: any;
}

const Onboarding = () => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slideRef = useRef<FlatList<Slides>>(null);
    const router = useRouter();

    const viewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0) {
                setCurrentIndex(viewableItems[0].index ?? 0);
            }
        }
    ).current;

    const viewConfig = useRef({
        viewAreaCoveragePercentThreshold: 50,
    }).current;

    const scrollTo = () => {
        if (currentIndex < slides.length - 1) {
            slideRef.current?.scrollToIndex({
                index: currentIndex + 1,
            });
        } else {
            router.push("/welcome");
        }
    };

    const isLast = currentIndex === slides.length - 1;

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" , justifyContent: "center", alignItems: "center",}}>
            <View style={{ flex: 3 }}>
                <FlatList
                    data={slides}
                    renderItem={({ item }) => (
                        <OnboardingItem item={item} />
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: false }
                    )}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    ref={slideRef}
                    viewabilityConfig={viewConfig}
                />
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
                <Paginator data={slides} scrollX={scrollX} />

                <View style={{ marginTop: 40 }}>
                    <NextButton
                        onPress={scrollTo}
                        isLast={isLast}
                    />
                </View>
            </View>
        </View>
    );
};

export default Onboarding;