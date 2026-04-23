import { View, Text, FlatList, StyleSheet, TouchableWithoutFeedback, Image, useWindowDimensions } from 'react-native'
import React from 'react'
import Animated, { AnimatedRef, interpolate, interpolateColor, SharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { OnboardingData } from '../data/data';
import { router } from 'expo-router';

type OnboardingButton = {
    flatlistRef: AnimatedRef<FlatList<OnboardingData>>;
    flatlistIndex: SharedValue<number>;
    dataLength: number;
    x: SharedValue<number>;
}

const OnboardingButton = ({flatlistRef, flatlistIndex, dataLength, x}: OnboardingButton) => {
    const {width: SCREEN_WIDTH} = useWindowDimensions();

    const arrowAnimationStyle = useAnimatedStyle(() => {
        return {
            width: 22.5,
            height: 22.5,
            opacity: flatlistIndex.value === dataLength - 1 ? withTiming(0) : withTiming(1),
            transform: [
                {
                    translateX: flatlistIndex.value === dataLength - 1 ?  withTiming(100) : withTiming(0)
                }
            ]
        }
    })

    const buttonAnimation = useAnimatedStyle(() => {
        return {
            width: flatlistIndex.value === dataLength - 1 ? withSpring(140) : withSpring(45),
            height: 45
        }
    });

    const animatedColor = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            x.value,
            [0, SCREEN_WIDTH, 2 * SCREEN_WIDTH],
            ['#005b4f', '#1e2169', '#f15937']
        );

        return {
            backgroundColor: backgroundColor
        }
    })
    
    const textAnimationStyle = useAnimatedStyle(() => {
        return {
            opacity: flatlistIndex.value === dataLength - 1 ? withTiming(1) : withTiming(0),
            transform: [
                {
                    translateX: flatlistIndex.value === dataLength - 1 ? withTiming(0) : withTiming(-100),
                }
            ]
        }
    })
    return (
        <TouchableWithoutFeedback
        onPress={() => {
            if(flatlistIndex.value < dataLength - 1){
                flatlistRef.current?.scrollToIndex({index: flatlistIndex.value + 1})
            } else {
                router.replace('/(auth)/login')
            }
        }}
        >
            <Animated.View style={[styles.container, animatedColor, buttonAnimation]}>
                <Animated.Text style={[styles.textButton, textAnimationStyle]}>Get Started</Animated.Text>
                <Animated.Image style={[styles.arrow, arrowAnimationStyle]} source={require('../assets/images/ArrowIcon.png')} /> 
            </Animated.View>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        padding: 10,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        width: 45,
        height: 45
    },
    arrow: {
        position: 'absolute',
        width: 22.5,
        height: 22.5
    },
    textButton: {
        color: 'white',
        fontSize: 18,
        position: 'absolute',
        fontWeight: 'bold'
    }
});

export default OnboardingButton;