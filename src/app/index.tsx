import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const C = { bg: '#090A0C', panel: '#141619', raised: '#1B1E22', border: '#272A2F', text: '#F5F5F6', muted: '#858A91', red: '#E82127', green: '#62D6A3' };

function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children.toUpperCase()}</Text>;
}

function Metric({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  return (
    <View style={styles.metric}>
      <Eyebrow>{label}</Eyebrow>
      <View style={styles.metricValueRow}><Text style={styles.metricValue}>{value}</Text>{unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}</View>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandLetter}>T</Text></View><Text style={styles.brandName}>TESLA</Text></View>
          <View style={styles.onlinePill}><View style={styles.onlineDot} /><Text style={styles.onlineText}>СВЪРЗАН</Text></View>
        </View>

        <View style={styles.headingRow}>
          <View><Text style={styles.pageTitle}>Моят автомобил</Text><Text style={styles.subtitle}>Вторник, 3 ноември</Text></View>
          <View style={styles.avatar}><Text style={styles.avatarText}>ИВ</Text></View>
        </View>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleTop}>
            <View><Eyebrow>МОЯТ TESLA</Eyebrow><Text style={styles.vehicleName}>Model Y</Text><Text style={styles.vehicleTrim}>Long Range · Dual Motor · 2023</Text></View>
            <View style={styles.awdBadge}><Text style={styles.awdText}>AWD</Text></View>
          </View>
          <View style={styles.carStage}>
            <View style={styles.carGlow} />
            <View style={styles.carDrawing}>
              <View style={styles.carWindow} />
              <View style={styles.carRoof} />
              <View style={styles.carBody}><View style={styles.carLightLeft} /><View style={styles.carLightRight} /><View style={styles.carDoorLine} /></View>
              <View style={styles.wheelLeft}><View style={styles.wheelHub} /></View><View style={styles.wheelRight}><View style={styles.wheelHub} /></View>
            </View>
            <View style={styles.carShadow} />
          </View>
          <View style={styles.vehicleFooter}><View style={styles.locationDot} /><View style={{ flex: 1 }}><Eyebrow>ПОСЛЕДНА ЛОКАЦИЯ</Eyebrow><Text style={styles.locationText}>бул. „Витоша“ 89, София</Text></View><Text style={styles.chevron}>›</Text></View>
        </View>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Общ преглед</Text><Text style={styles.updated}>ОБНОВЕНО СЕГА</Text></View>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.batteryCard]}>
            <View style={styles.metricCardTop}><Eyebrow>БАТЕРИЯ</Eyebrow><View style={styles.batteryIcon}><View style={styles.batteryFill} /></View></View>
            <View style={styles.metricValueRow}><Text style={styles.metricValue}>78</Text><Text style={styles.metricUnit}>%</Text></View>
            <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
            <Text style={styles.metricDetail}>≈ 356 km пробег</Text>
          </View>
          <View style={styles.metricCard}><Metric label="ПОСЛЕДНО ЗАРЕЖДАНЕ" value="42.8" unit="kWh" detail="Вчера · Supercharger" /></View>
          <View style={styles.metricCard}><Metric label="СРЕДЕН РАЗХОД" value="16.4" unit="kWh/100 km" detail="Последни 30 дни" /></View>
          <View style={styles.metricCard}><Metric label="ИЗМИНАТИ" value="1 284" unit="km" detail="Този месец" /></View>
        </View>

        <View style={styles.note}><Text style={styles.noteMark}>✳</Text><Text style={styles.noteText}>Всички данни са примерни и не са свързани с автомобила.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30, maxWidth: 600, width: '100%', alignSelf: 'center' },
  topBar: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 25, height: 25, borderRadius: 8, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }, brandLetter: { color: 'white', fontWeight: '900', fontSize: 14, fontStyle: 'italic' }, brandName: { color: C.text, fontSize: 12, fontWeight: '800', letterSpacing: 3.2 }, onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#111D19', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 }, onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }, onlineText: { color: C.green, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, pageTitle: { color: C.text, fontSize: 25, fontWeight: '700', letterSpacing: -0.5 }, subtitle: { color: C.muted, fontSize: 13, marginTop: 5 }, avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel }, avatarText: { color: '#C5C8CC', fontSize: 11, fontWeight: '700' },
  vehicleCard: { borderRadius: 22, backgroundColor: C.panel, borderWidth: 1, borderColor: '#202327', overflow: 'hidden', marginBottom: 25 }, vehicleTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 18 }, eyebrow: { color: C.muted, fontSize: 9, lineHeight: 13, fontWeight: '700', letterSpacing: 1.25 }, vehicleName: { color: C.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.6, marginTop: 3 }, vehicleTrim: { color: '#A0A4AA', fontSize: 12, marginTop: 3 }, awdBadge: { borderRadius: 7, borderWidth: 1, borderColor: '#3C2426', backgroundColor: '#241719', paddingHorizontal: 8, paddingVertical: 5 }, awdText: { color: '#F17C80', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  carStage: { height: 166, alignItems: 'center', justifyContent: 'center', marginTop: -1 }, carGlow: { position: 'absolute', width: 210, height: 105, borderRadius: 110, backgroundColor: '#22272B', opacity: 0.7, top: 28 }, carDrawing: { width: 270, height: 112, position: 'relative', marginTop: 19 }, carRoof: { position: 'absolute', left: 72, top: 20, width: 127, height: 49, borderTopLeftRadius: 80, borderTopRightRadius: 80, backgroundColor: '#858A8F', borderWidth: 1, borderColor: '#AEB2B5' }, carWindow: { zIndex: 1, position: 'absolute', left: 85, top: 30, width: 101, height: 36, borderTopLeftRadius: 47, borderTopRightRadius: 47, backgroundColor: '#11181C' }, carBody: { position: 'absolute', left: 20, top: 60, width: 230, height: 37, backgroundColor: '#C8CBCD', borderRadius: 24, borderTopLeftRadius: 40, borderTopRightRadius: 45, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }, carLightLeft: { position: 'absolute', left: 6, top: 9, width: 18, height: 4, borderRadius: 4, backgroundColor: '#F4F2EB' }, carLightRight: { position: 'absolute', right: 5, top: 10, width: 15, height: 4, borderRadius: 4, backgroundColor: C.red }, carDoorLine: { position: 'absolute', left: 124, top: 6, width: 1, height: 22, backgroundColor: '#9EA2A5' }, wheelLeft: { position: 'absolute', top: 83, left: 57, width: 30, height: 30, borderRadius: 15, backgroundColor: '#090A0C', borderWidth: 3, borderColor: '#60666B', alignItems: 'center', justifyContent: 'center' }, wheelRight: { position: 'absolute', top: 83, right: 57, width: 30, height: 30, borderRadius: 15, backgroundColor: '#090A0C', borderWidth: 3, borderColor: '#60666B', alignItems: 'center', justifyContent: 'center' }, wheelHub: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#95999C' }, carShadow: { position: 'absolute', bottom: 9, width: 225, height: 12, borderRadius: 20, backgroundColor: '#070809', opacity: 0.75 },
  vehicleFooter: { minHeight: 61, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 11, borderTopWidth: 1, borderTopColor: C.border }, locationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red }, locationText: { color: C.text, fontSize: 12, marginTop: 3 }, chevron: { color: '#70757B', fontSize: 26, fontWeight: '300' }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700' }, updated: { color: '#777C82', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metricCard: { width: '48.4%', flexGrow: 1, minHeight: 121, padding: 14, borderRadius: 17, backgroundColor: C.panel, borderWidth: 1, borderColor: '#202327', justifyContent: 'center' }, batteryCard: { justifyContent: 'center' }, metric: {}, metricCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 9 }, metricValue: { color: C.text, fontSize: 27, lineHeight: 31, fontWeight: '600', letterSpacing: -0.8 }, metricUnit: { color: '#A5A9AE', fontSize: 10, fontWeight: '500' }, metricDetail: { color: C.muted, fontSize: 10, marginTop: 7 }, batteryIcon: { width: 19, height: 10, borderWidth: 1, borderColor: '#72777D', borderRadius: 2, padding: 1 }, batteryFill: { width: '78%', height: '100%', borderRadius: 1, backgroundColor: C.green }, progressTrack: { height: 3, borderRadius: 3, backgroundColor: '#30353A', marginTop: 10 }, progressFill: { width: '78%', height: 3, borderRadius: 3, backgroundColor: C.green }, note: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center' }, noteMark: { color: '#777C82', fontSize: 11 }, noteText: { color: '#777C82', fontSize: 10 },
});
