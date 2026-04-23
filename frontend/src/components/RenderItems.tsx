import { View, Text, useWindowDimensions, StyleSheet } from 'react-native'
import React from 'react'
import { OnboardingData } from '../data/data'
import LottieView from 'lottie-react-native';
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

type RenderItems = {
    item: OnboardingData;
    index: number;
    x: SharedValue<number>;
}

const RenderItems = ({item, index, x} : RenderItems) => {
    const {width: SCREEN_WIDTH} = useWindowDimensions();

    const lottieAnimationStyle = useAnimatedStyle(() => {
        const translateYAnimation = interpolate(
            x.value,
            [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH
            ],
            [200, 0, -200],
            Extrapolation.CLAMP,
        );
        return {
            transform: [{translateY: translateYAnimation}]
        }
    })

    const circleAnimation = useAnimatedStyle(() => {
        const scale = interpolate(
            x.value,
            [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH
            ],
            [1, 4, 4],
            Extrapolation.CLAMP,
        );
        return {
            transform: [{scale: scale}]
        }
    })
    return (
        <View style={[styles.itemContainer, {width: SCREEN_WIDTH}]}>
            <View style={styles.circleContainer}>
                <Animated.View
                style={[{
                    width: SCREEN_WIDTH, height: SCREEN_WIDTH,
                    backgroundColor: item.backgroundColor,
                    borderRadius: SCREEN_WIDTH /2 
                }, circleAnimation]}
                />
            </View>
            <Animated.View style={lottieAnimationStyle}>
                <LottieView source={item.animation} style={{ width: SCREEN_WIDTH * 0.9, height: SCREEN_WIDTH * 0.9}}
                autoPlay
                loop
                />
            </Animated.View>
            <Text style={[styles.headlineText, {color: item.textColor}]}>{item.headline}</Text>
            <Text style={[styles.bodyText, {color: item.textColor}]}>{item.body}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    itemContainer: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 120
    },
    headlineText: {
        textAlign: 'center',
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 5,
        marginHorizontal: 20
    },
    bodyText: {
        textAlign: 'center',
        fontSize: 22,
        marginHorizontal: 20,
        marginTop: -60
    },
    circleContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'flex-end'
    }
});

export default RenderItems;