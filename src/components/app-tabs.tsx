import { NativeTabs } from 'expo-router/native-tabs';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#090A0C"
      tintColor="#E82127"
      labelStyle={{ color: '#858A91', selected: { color: '#F5F5F6' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Начало</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'car.side', selected: 'car.side.fill' }} md="directions_car" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="charging">
        <NativeTabs.Trigger.Label>Зареждане</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bolt', selected: 'bolt.fill' }} md="bolt" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Label>Пътувания</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'point.topleft.down.to.point.bottomright.curvepath', selected: 'point.topleft.down.to.point.bottomright.curvepath.fill' }} md="route" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
