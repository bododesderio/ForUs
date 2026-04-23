import { View, Text } from 'react-native'
import React, { useState } from 'react'
import TabButtons, { TabButtonsType } from './TabButtons'

export enum CustomTab {
    Tab1,
    Tab2
}

const TabScreen = () => {
    const [selectedTab, setSelectedTab] = useState(CustomTab.Tab1)
    const buttons: TabButtonsType[] = [{ title: "Tab 1"}, {title: "Tab2"}]
    return (
        <>
            <TabButtons buttons={buttons} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
            <View style={{ flex: 1, marginTop: 20, alignItems: "center"}}>
                {
                    selectedTab === CustomTab.Tab1 ? (
                        <Text> Tab 1 Content</Text>
                    ) : (
                        <Text> Tab 2 Content</Text>
                    )
                }
            </View>
        </>
    )
}

export default TabScreen