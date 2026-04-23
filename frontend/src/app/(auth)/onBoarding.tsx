import { View, Text, StyleSheet, FlatList, ViewToken } from 'react-native'
import React from 'react'
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import data, { OnboardingData } from '../../data/data'
import RenderItems from '../../components/RenderItems'
import Pagination from '../../components/Pagination'
import OnboardingButton from '../../components/OnboardingButton'

const onBoarding = () => {
    const flatlistRef = useAnimatedRef<FlatList<OnboardingData>>();
    const x = useSharedValue(0);

    const flatlistIndex = useSharedValue(0);

    const onViewableItemsChanged = ({viewableItems}: {viewableItems: ViewToken[]}) => {
        if(viewableItems[0].index !== null) {
            flatlistIndex.value = viewableItems[0].index;
        }
    }

    const onScroll = useAnimatedScrollHandler({
        onScroll: event => {
            x.value = event.contentOffset.x;
        },
    });
    return (
        <View style={styles.container}>
            <Animated.FlatList 
            ref={flatlistRef}
            onScroll={onScroll}
            data={data}
            renderItem={({item, index}) => {
                return (
                    <RenderItems item={item} index={index} x={x} />
                );
            }}
            keyExtractor={item => item.id.toString()}
            scrollEventThrottle={16}
            horizontal={true}
            bounces={false}
            pagingEnabled={true}
            showsHorizontalScrollIndicator={false} 
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{
                minimumViewTime: 300,
                viewAreaCoveragePercentThreshold: 10
            }}
            />
            <View style={styles.bottomContainer}>
                <Pagination data={data} x={x} />
                <OnboardingButton
                flatlistRef={flatlistRef}
                flatlistIndex={flatlistIndex}
                x={x}
                dataLength={data.length}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex:1
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        marginHorizontal: 30,
        paddingVertical: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
});

export default onBoarding;