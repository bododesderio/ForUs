import { Image, ImageBackground, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import React from 'react'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { DataType } from '../data/card-data'
import Animated, { interpolate, runOnJS, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import COLORS from '../constants/theme'
// import truncateWords from '../helper/truncateWords'

type Card = {
    item: DataType;
    index: number;
    dataLength: number;
    maxVisiblesItem: number;
    currentIndex: number;
    animatedValue: SharedValue<number>;
    setNewData: React.Dispatch<React.SetStateAction<DataType[]>>;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    newData: DataType[];
}

type truncateWords ={
    text: string;
}

const Card = ({
    item, 
    index, 
    dataLength, 
    maxVisiblesItem, 
    currentIndex, 
    animatedValue, 
    setNewData, 
    setCurrentIndex, 
    newData} : Card) => {
    const {width} = useWindowDimensions();
    const translateX = useSharedValue(0);
    const direction = useSharedValue(0);

    const pan = Gesture.Pan().onUpdate(e  => {
        const isSwipeRight = e.translationX > 0;
        direction.value = isSwipeRight ? 1 : -1;
        if(currentIndex === index){
            translateX.value = e.translationX;
            animatedValue.value = interpolate(
                Math.abs(e.translationX),
                [0, width],
                [index, index + 1]
            )
        }
    }).onEnd(e => {
        if(currentIndex === index){
            if(Math.abs(e.translationX) > 150 || Math.abs(e.velocityX) > 1000){
                translateX.value = withTiming(width * direction.value, {}, () => {
                    runOnJS(setCurrentIndex)(currentIndex + 1);
                    runOnJS(setNewData)([...newData, newData[currentIndex]])
                })
                animatedValue.value = withTiming(currentIndex + 1)
            }else{
                translateX.value = withTiming(0, {duration: 500})
                animatedValue.value = withTiming(currentIndex)
            }
        }
    })
    const animatedStyle = useAnimatedStyle(() => {
        const currentItem = index === currentIndex

        const rotateZ = interpolate(
            Math.abs(translateX.value),
            [0,width],
            [0, 20]
        )

        const translateY = interpolate(
            animatedValue.value,
            [index - 1, index],
            [0, 0]
        )

        const scale = interpolate(
            animatedValue.value,
            [index - 1, index],
            [0.9, 1]
        )

        const opacity = interpolate(
            animatedValue.value + maxVisiblesItem,
            [index, index + 1],
            [0, 1]
        )
        return {
            transform: [{translateX: translateX.value},
                {
                    scale: currentItem ? 1 : scale,
                },
                {
                    translateY: currentItem ? 0 : translateY,
                },
                // {
                //     rotateZ: currentItem ? `${direction.value * rotateZ}deg` : '0deg'
                // }
            ], opacity: index < maxVisiblesItem + currentIndex ? 1 : opacity
        }
    })

    const styles = StyleSheet.create({
        container: {
            position: "absolute", 
            width: width - 32,
            height: 160,
            borderRadius: 20,
            overflow: "hidden"
        },
        imageContainer: {
            width: 80,
            height: 40,
        },
        backgroundImage: {
            flex: 1,
            padding: 16,
        },
        overlay: {
            ...StyleSheet.absoluteFillObject, 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
        },
        content: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        },
        topSection: {
            flex: 1,
            justifyContent: 'flex-start',
        },
        titleText: {
            fontSize: 24,
            fontWeight: 'bold',
            color: COLORS.white,
            marginBottom: 10,
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
        },
        middleSection: {
            flex: 2,
            justifyContent: 'center',
        },
        dateText: {
            fontSize: 18,
            fontWeight: '600',
            color: COLORS.white,
            marginBottom: 4,
        },
        locationText: {
            fontSize: 16,
            color: COLORS.white,
            marginBottom: 2,
            opacity: 0.9,
        },
        organizerText: {
            fontSize: 14,
            color: COLORS.white,
            opacity: 0.8,
            marginBottom: 8,
        },
        descriptionText: {
            fontSize: 14,
            color: COLORS.white,
            opacity: 0.9,
            lineHeight: 14,
            minHeight: 0,
        },
        bottomSection: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        statusContainer: {
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
        },
        statusText: {
            fontSize: 12,
            color: COLORS.white,
            fontWeight: '500',
            textTransform: 'uppercase',
        },
    });

    const truncateWords = (text, maxWords = 5) => {
        const words = text.split(' ');
        if (words.length <= maxWords) return text;
        return words.slice(0, maxWords).join(' ') + '...';
    };
    return (
        <GestureDetector gesture={pan}>
            <Animated.View style={[styles.container, animatedStyle, {zIndex: dataLength - index, }]}>
                <ImageBackground source={item.image} resizeMode='cover' style={styles.backgroundImage}>

                <View style={styles.overlay} />

                <View style={styles.content}>
                    <View style={styles.topSection}>
                        <Text style={styles.titleText}>{item.title}</Text>
                    </View>
                    <View style={styles.middleSection}>
                        <Text style={styles.dateText}>{item.date}</Text>
                        <Text style={styles.locationText}>{item.location}</Text>
                        <Text style={styles.organizerText}>{item.organizer}</Text>
                        <Text style={styles.descriptionText}>{truncateWords(item.description)}</Text>
                    </View>
                    <View style={styles.bottomSection}>
                        <View style={styles.statusContainer}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                    </View>
                </View>

                </ImageBackground>
            </Animated.View>
        </GestureDetector>
    )
}

export default Card;

