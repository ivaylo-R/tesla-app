import { router, type Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';

import { AuthScreen } from '@/features/auth/auth-screen';
import { useAuth } from '@/features/auth/auth-context';

export default function AppTabs() {
  const { configured, loading, user, recoveryRequired } = useAuth();

  useEffect(() => {
    if (!loading && user && recoveryRequired) router.replace('/auth/reset-password' as Href);
  }, [loading, recoveryRequired, user]);

  if (loading || (user && recoveryRequired)) return <View style={s.loading}><ActivityIndicator color="#E82127" /></View>;
  if (!configured || !user) return <AuthScreen />;

  return <Tabs style={s.app}><TabSlot style={s.slot}/><TabList style={s.bar}>
    <TabTrigger name="index" href={'/' as Href} asChild><TabButton icon="▱">Начало</TabButton></TabTrigger>
    <TabTrigger name="charging" href={'/charging' as Href} asChild><TabButton icon="ϟ">Зареждане</TabButton></TabTrigger>
    <TabTrigger name="trips" href={'/trips' as Href} asChild><TabButton icon="↗">Пътувания</TabButton></TabTrigger>
  </TabList></Tabs>;
}

function TabButton({ children, isFocused, icon, ref: _ref, ...props }: TabTriggerSlotProps & { icon: string }) {
  return <Pressable {...props} style={s.tab}><Text style={[s.icon,isFocused&&s.iconActive]}>{icon}</Text><Text style={[s.label,isFocused&&s.labelActive]}>{children}</Text></Pressable>;
}

const s=StyleSheet.create({loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#090A0C'},app:{flex:1,backgroundColor:'#090A0C'},slot:{flex:1},bar:{position:'absolute',bottom:0,left:0,right:0,height:72,flexDirection:'row',backgroundColor:'#111316',borderTopWidth:1,borderTopColor:'#25282D',paddingBottom:8,paddingTop:9},tab:{flex:1,alignItems:'center',justifyContent:'center',gap:4},icon:{fontSize:19,color:'#858A91',lineHeight:21},iconActive:{color:'#E82127'},label:{fontSize:10,color:'#858A91',fontWeight:'500'},labelActive:{color:'#E82127',fontWeight:'600'}});
