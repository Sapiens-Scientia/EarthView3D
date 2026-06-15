import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Billboard, Line, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useAppContext } from '../../contexts'
import type { ThemeMode } from '../../contexts'
import { EarthNorthArrowLocalYNorth } from './EarthSpinDecor3D'

export type EarthVisualizationMode = 'globe' | 'orbit' | 'spiral' | 'galaxy'

interface EarthCoords {
    lat: number
    lng: number
}

const AXIAL_TILT_DEG = 23.44
const AXIAL_TILT_RAD = (AXIAL_TILT_DEG * Math.PI) / 180
const ECLIPTIC_NORTH = new THREE.Vector3(0, 1, 0)
const DAY_MS = 24 * 60 * 60 * 1000
const DISPLAY_YEAR_MS = 365 * DAY_MS
const ORBIT_RADIUS = 2.2
const SPIRAL_RADIUS = 1.8
const SPIRAL_TURNS = 10
const SPIRAL_PITCH = 1.9
const SPIRAL_POINTS = 1000
const GALACTIC_YEAR_SOLAR_YEARS = 225_000_000
const EARTH_AGE_SOLAR_YEARS = 4_540_000_000
const EARTH_AGE_MA = EARTH_AGE_SOLAR_YEARS / 1_000_000
const GALACTIC_YEAR_MA = GALACTIC_YEAR_SOLAR_YEARS / 1_000_000
const GALACTIC_TURNS = EARTH_AGE_MA / GALACTIC_YEAR_MA
const GALAXY_ORBIT_RADIUS = 1.95
const GALAXY_HISTORY_HEIGHT = 8.2
const GALAXY_DISK_SIZE = 7
const GALAXY_TEXTURE_ZOOM = 0.68
const GALAXY_EARTH_ORBIT_DECORATIVE_TURNS = 2080
const GALAXY_EARTH_ORBIT_DECORATIVE_POINTS = 41600
const GALAXY_EARTH_ORBIT_DECORATIVE_RADIUS = 0.0725
const FUTURE_PROJECTION_MA = 2_000
const ECLIPTIC_TO_GALACTIC_RAD = (60.2 * Math.PI) / 180
const GALAXY_LABEL_RADIAL_SPREAD = 1.18

const SEASON_EVENTS = [
    { key: 'VE', label: 'Mar Equinox', monthIndex: 2, day: 20, color: '#22c55e' },
    { key: 'SS', label: 'Jun Solstice', monthIndex: 5, day: 21, color: '#facc15' },
    { key: 'AE', label: 'Sep Equinox', monthIndex: 8, day: 22, color: '#f97316' },
    { key: 'WS', label: 'Dec Solstice', monthIndex: 11, day: 21, color: '#38bdf8' },
]

const SEASON_HALO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TIMEZONE_OFFSETS = Array.from({ length: 24 }, (_, index) => index - 10)
const EASTERN_TIMEZONE = 'America/New_York'

const SEASON_COLORS = {
    winter: [0.1, 0.48, 0.78] as [number, number, number],
    spring: [0.06, 0.52, 0.23] as [number, number, number],
    summer: [0.72, 0.5, 0.02] as [number, number, number],
    autumn: [0.72, 0.26, 0.03] as [number, number, number],
}

const GEO_SCALE_LABELS = [
    { label: 'Hadean Eon', ageMa: 4540, level: 'eon', color: '#dc2626', summary: 'Molten young Earth' },
    { label: 'Archean Eon', ageMa: 4000, level: 'eon', color: '#facc15', summary: 'First stable crust' },
    { label: 'Proterozoic Eon', ageMa: 2500, level: 'eon', color: '#8b5cf6', summary: 'Oxygen and cells' },
    { label: 'Phanerozoic Eon', ageMa: 538.8, level: 'eon', color: '#16a34a', summary: 'Visible animal life' },
    { label: 'Eoarchean Era', ageMa: 4000, level: 'era', color: '#facc15', summary: 'Oceans and crust' },
    { label: 'Paleoarchean Era', ageMa: 3600, level: 'era', color: '#facc15', summary: 'Early microbes' },
    { label: 'Mesoarchean Era', ageMa: 3200, level: 'era', color: '#facc15', summary: 'Early continents' },
    { label: 'Neoarchean Era', ageMa: 2800, level: 'era', color: '#facc15', summary: 'Oxygen begins rising' },
    { label: 'Paleoproterozoic Era', ageMa: 2500, level: 'era', color: '#a78bfa', summary: 'Great oxidation' },
    { label: 'Mesoproterozoic Era', ageMa: 1600, level: 'era', color: '#a78bfa', summary: 'Supercontinents' },
    { label: 'Neoproterozoic Era', ageMa: 1000, level: 'era', color: '#a78bfa', summary: 'Snowball Earth' },
    { label: 'Paleozoic Era', ageMa: 538.8, level: 'era', color: '#22c55e', summary: 'Seas to forests' },
    { label: 'Mesozoic Era', ageMa: 251.9, level: 'era', color: '#65a30d', summary: 'Dinosaurs dominate' },
    { label: 'Cenozoic Era', ageMa: 66, level: 'era', color: '#10b981', summary: 'Mammals diversify' },
    { label: 'Cambrian Period', ageMa: 538.8, level: 'period', color: '#4ade80', summary: 'Animal explosion' },
    { label: 'Ordovician Period', ageMa: 485.4, level: 'period', color: '#4ade80', summary: 'Marine life blooms' },
    { label: 'Silurian Period', ageMa: 443.8, level: 'period', color: '#4ade80', summary: 'Plants on land' },
    { label: 'Devonian Period', ageMa: 419.2, level: 'period', color: '#4ade80', summary: 'Age of fishes' },
    { label: 'Carboniferous Period', ageMa: 358.9, level: 'period', color: '#4ade80', summary: 'Coal forests' },
    { label: 'Permian Period', ageMa: 298.9, level: 'period', color: '#4ade80', summary: 'Pangaea and reptiles' },
    { label: 'Triassic Period', ageMa: 251.9, level: 'period', color: '#84cc16', summary: 'First dinosaurs' },
    { label: 'Jurassic Period', ageMa: 201.4, level: 'period', color: '#84cc16', summary: 'Giant dinosaurs' },
    { label: 'Cretaceous Period', ageMa: 145, level: 'period', color: '#84cc16', summary: 'Flowers spread' },
    { label: 'Paleogene Period', ageMa: 66, level: 'period', color: '#34d399', summary: 'Mammal rebound' },
    { label: 'Neogene Period', ageMa: 23.03, level: 'period', color: '#34d399', summary: 'Grasslands expand' },
    { label: 'Quaternary Period', ageMa: 2.58, level: 'period', color: '#34d399', summary: 'Ice ages and humans' },
    { label: 'Paleocene Epoch', ageMa: 66, level: 'epoch', color: '#bbf7d0', summary: 'Post-impact recovery' },
    { label: 'Eocene Epoch', ageMa: 56, level: 'epoch', color: '#bbf7d0', summary: 'Warm greenhouse' },
    { label: 'Oligocene Epoch', ageMa: 33.9, level: 'epoch', color: '#bbf7d0', summary: 'Cooler climates' },
    { label: 'Miocene Epoch', ageMa: 23.03, level: 'epoch', color: '#bbf7d0', summary: 'Apes diversify' },
    { label: 'Pliocene Epoch', ageMa: 5.333, level: 'epoch', color: '#bbf7d0', summary: 'Early hominins' },
    { label: 'Pleistocene Epoch', ageMa: 2.58, level: 'epoch', color: '#bbf7d0', summary: 'Glacial cycles' },
    { label: 'Holocene Epoch', ageMa: 0.0117, level: 'epoch', color: '#bbf7d0', summary: 'Human civilizations' },
] as const

const FUTURE_EARTH_EVENTS = [
    { label: 'Complex surface life stressed', yearsFromNowMa: 1500, color: '#fbbf24', summary: 'Solar brightening greenhouse risk' },
    { label: 'Surface habitability fades', yearsFromNowMa: 2000, color: '#fb923c', summary: 'Oceans likely begin evaporating' },
] as const

function getOrbitalProgress(date: Date): number {
    const year = date.getFullYear()
    const start = new Date(year, 0, 1).getTime()
    const end = new Date(year + 1, 0, 1).getTime()
    return (date.getTime() - start) / (end - start)
}

function getProgressForDate(year: number, monthIndex: number, day: number): number {
    return getOrbitalProgress(new Date(year, monthIndex, day))
}

function formatNowMarkerTime(date: Date, timeZone?: string, hour12?: boolean): string {
    return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        ...(hour12 !== undefined ? { hour12 } : {}),
        ...(timeZone ? { timeZone } : {}),
    }).format(date)
}

function getTimePartsInTimezone(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
        timeZone,
    }).formatToParts(date)
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? date.getHours())
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? date.getMinutes())
    const second = Number(parts.find((part) => part.type === 'second')?.value ?? date.getSeconds())
    return { hour: positiveModulo(hour, 24), minute, second }
}

function getTimezoneOffsetHours(date: Date, timeZone: string) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'shortOffset',
        }).formatToParts(date)
        const offset = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
        const match = offset.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
        if (!match) return -date.getTimezoneOffset() / 60

        const sign = match[1] === '-' ? -1 : 1
        const hours = Number(match[2])
        const minutes = Number(match[3] ?? '0')
        return sign * (hours + minutes / 60)
    } catch {
        return -date.getTimezoneOffset() / 60
    }
}

function formatTimezoneOffset(offset: number): string {
    if (offset === 0) return 'UTC'
    return `${offset > 0 ? '+' : ''}${offset}`
}

function positiveModulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor
}

function formatSeasonHaloDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date)
}

function formatSolarYearCount(years: number): string {
    if (years >= 1_000_000_000) return `${Number((years / 1_000_000_000).toPrecision(3))}B`
    if (years >= 1_000_000) return `${Number((years / 1_000_000).toPrecision(3))}M`
    return new Intl.NumberFormat(undefined).format(years)
}

function formatEarthAge(earthAgeMa: number): string {
    if (Math.abs(earthAgeMa) < 0.0005) return '0 Ma EA'
    return `${Number(earthAgeMa.toPrecision(3))} Ma EA`
}

function ageMaToEarthAge(ageMa: number): number {
    return EARTH_AGE_MA - ageMa
}

function getMonthMidpointProgress(year: number, monthIndex: number): number {
    const monthStart = new Date(year, monthIndex, 1).getTime()
    const monthEnd = new Date(year, monthIndex + 1, 1).getTime()
    return getOrbitalProgress(new Date((monthStart + monthEnd) / 2))
}

function progressToAngle(progress: number): number {
    return progress * Math.PI * 2 + Math.PI / 2
}

function orbitPoint(progress: number, radius = ORBIT_RADIUS, y = 0) {
    const angle = progressToAngle(progress)
    return new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        -Math.sin(angle) * radius,
    )
}

function getSeasonColor(year: number, progress: number) {
    const spring = getProgressForDate(year, 2, 20)
    const summer = getProgressForDate(year, 5, 21)
    const autumn = getProgressForDate(year, 8, 22)
    const winter = getProgressForDate(year, 11, 21)

    if (progress >= winter || progress < spring) return SEASON_COLORS.winter
    if (progress < summer) return SEASON_COLORS.spring
    if (progress < autumn) return SEASON_COLORS.summer
    return SEASON_COLORS.autumn
}

function makeEarthTiltQuaternion(year: number) {
    const winterProgress = getProgressForDate(year, 11, 21)
    const tiltToward = orbitPoint(winterProgress, 1).normalize()
    const tiltAxis = new THREE.Vector3().crossVectors(ECLIPTIC_NORTH, tiltToward).normalize()
    return new THREE.Quaternion().setFromAxisAngle(tiltAxis, AXIAL_TILT_RAD)
}

function getNorthHaloAngle(year: number) {
    const northAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(makeEarthTiltQuaternion(year))
    return Math.atan2(-northAxis.z, northAxis.x)
}

function getSunAnchoredHaloAngle(referenceDate = new Date()) {
    const year = referenceDate.getFullYear()
    const progress = getOrbitalProgress(referenceDate)
    const summer = getProgressForDate(year, 5, 21)
    return getNorthHaloAngle(year) - (summer - progress) * Math.PI * 2
}

function getSunAnchoredNorthDirection(date: Date, anchorAngle = getSunAnchoredHaloAngle()) {
    const year = date.getFullYear()
    const progress = getOrbitalProgress(date)
    const summer = getProgressForDate(year, 5, 21)
    const angle = anchorAngle - (progress - summer) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)).normalize()
}

function makeEarthTiltQuaternionForNorthDirection(direction: THREE.Vector3) {
    const northAxis = direction.clone().setY(0).normalize().multiplyScalar(Math.sin(AXIAL_TILT_RAD))
    northAxis.y = Math.cos(AXIAL_TILT_RAD)
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), northAxis.normalize())
}

function getHaloDirectionForProgress(currentProgress: number, targetProgress: number, year: number) {
    const angle = getNorthHaloAngle(year) - (targetProgress - currentProgress) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)).normalize()
}

function getSunDirectionFromEarth(progress: number) {
    return orbitPoint(progress, 1).multiplyScalar(-1).normalize()
}

function getEclipticRotationQuaternion(progress: number) {
    return new THREE.Quaternion().setFromAxisAngle(ECLIPTIC_NORTH, progress * Math.PI * 2)
}

function rotateEclipticVector(vector: THREE.Vector3, progress: number) {
    return vector.clone().applyQuaternion(getEclipticRotationQuaternion(progress)).normalize()
}

function getDailySpinAngle(date: Date, earthTiltQuaternion: THREE.Quaternion, sunDirection: THREE.Vector3): number {
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 3600000
    const localSun = sunDirection.clone().applyQuaternion(earthTiltQuaternion.clone().invert())
    const noonOffset = Math.atan2(-localSun.z, localSun.x)
    return noonOffset + ((utcHours - 12) / 24) * Math.PI * 2
}

function timeToSpiralY(t: number) {
    const totalLength = SPIRAL_TURNS * SPIRAL_PITCH
    return t * totalLength - totalLength / 2
}

function pointOnSpiral(t: number) {
    const turnProgress = t * SPIRAL_TURNS
    const progress = turnProgress - Math.floor(turnProgress)
    const p = orbitPoint(progress, SPIRAL_RADIUS, timeToSpiralY(t))
    return p
}

function galaxyPoint(ageMa: number, radius = GALAXY_ORBIT_RADIUS) {
    const elapsedMa = EARTH_AGE_MA - ageMa
    const t = Math.max(0, elapsedMa / EARTH_AGE_MA)
    const angle = -t * GALACTIC_TURNS * Math.PI * 2 - Math.PI / 2
    const y = (t - 0.5) * GALAXY_HISTORY_HEIGHT
    return new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        -Math.sin(angle) * radius,
    )
}

function galaxyRadialOffset(ageMa: number, offset: number) {
    const base = galaxyPoint(ageMa)
    const radial = new THREE.Vector3(base.x, 0, base.z).normalize()
    return base.clone().add(radial.multiplyScalar(offset))
}

function galaxyLabelOffset(ageMa: number, offset: number) {
    return galaxyRadialOffset(ageMa, offset * GALAXY_LABEL_RADIAL_SPREAD)
}

function galaxyMotionDirection(ageMa: number) {
    const point = galaxyPoint(ageMa)
    const angle = Math.atan2(-point.z, point.x)
    return new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize()
}

function latLngToEarthPoint(lat: number, lng: number, radius = 1) {
    const latRad = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(lat, -89.9, 89.9))
    const lngRad = THREE.MathUtils.degToRad(lng + 180)
    const cosLat = Math.cos(latRad)

    return new THREE.Vector3(
        -Math.cos(lngRad) * cosLat * radius,
        Math.sin(latRad) * radius,
        Math.sin(lngRad) * cosLat * radius,
    )
}

function cameraVectorForProgress(progress: number, distance: number, y: number) {
    const direction = orbitPoint(progress, 1).normalize()
    return new THREE.Vector3(direction.x * distance, y, direction.z * distance)
}

function cameraVectorForDirection(direction: THREE.Vector3, distance: number, y: number) {
    return new THREE.Vector3(direction.x * distance, y, direction.z * distance)
}

function getCameraPosition(mode: EarthVisualizationMode, date = new Date()) {
    const year = date.getFullYear()
    const julyProgress = getProgressForDate(year, 6, 1)
    if (mode === 'globe') {
        const currentProgress = getOrbitalProgress(date)
        return cameraVectorForDirection(getSunDirectionFromEarth(currentProgress), 3.55, 0.68)
    }
    if (mode === 'orbit') return cameraVectorForProgress(0.5, 6.1, 5.85)
    if (mode === 'galaxy') return new THREE.Vector3(0, 12.2, 17.5)
    return cameraVectorForProgress(julyProgress, 8.8, 6)
}

function withSpiralRadius(point: THREE.Vector3, radius: number) {
    const radial = new THREE.Vector3(point.x, 0, point.z).normalize()
    return new THREE.Vector3(radial.x * radius, point.y, radial.z * radius)
}

function Stars({ isDark, theme }: { isDark: boolean; theme: ThemeMode }) {
    const positions = useMemo(() => {
        const starCount = 1600
        const arr = new Float32Array(starCount * 3)
        for (let i = 0; i < starCount; i++) {
            const r = 15 + Math.random() * 16
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            arr[i * 3 + 2] = r * Math.cos(phi)
        }
        return arr
    }, [])

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={1600} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial
                size={isDark ? 0.032 : 0.024}
                color={isDark ? '#ffffff' : theme === 'sepia' ? '#d7e7ff' : '#e8f2ff'}
                transparent
                opacity={isDark ? 0.92 : theme === 'sepia' ? 0.52 : 0.36}
                sizeAttenuation
            />
        </points>
    )
}

function EarthTexture({ isDark, theme }: { isDark: boolean; theme: ThemeMode }) {
    const surfaceTexture = useLoader(THREE.TextureLoader, '/earth-blue-marble-5400x2700.jpg')

    const displayTexture = useMemo(() => {
        surfaceTexture.colorSpace = THREE.SRGBColorSpace
        surfaceTexture.wrapS = THREE.RepeatWrapping
        surfaceTexture.wrapT = THREE.ClampToEdgeWrapping
        surfaceTexture.anisotropy = 8

        const image = surfaceTexture.image as CanvasImageSource | undefined
        if (!image || typeof document === 'undefined') return surfaceTexture

        const canvas = document.createElement('canvas')
        const width = 'naturalWidth' in image ? image.naturalWidth : ('videoWidth' in image ? image.videoWidth : (image as any).width)
        const height = 'naturalHeight' in image ? image.naturalHeight : ('videoHeight' in image ? image.videoHeight : (image as any).height)
        if (!width || !height) return surfaceTexture

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return surfaceTexture

        ctx.drawImage(image, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const { data } = imageData

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i]
            let g = data[i + 1]
            let b = data[i + 2]
            const oceanStrength = Math.max(0, b - Math.max(r, g)) / 255
            const globalLift = isDark ? 24 : theme === 'sepia' ? 28 : 32
            const oceanLift = (isDark ? 68 : theme === 'sepia' ? 76 : 82) * oceanStrength
            const saturationLift = 1 + (isDark ? 0.1 : theme === 'sepia' ? 0.12 : 0.08) + oceanStrength * (isDark ? 0.26 : theme === 'sepia' ? 0.3 : 0.24)

            data[i] = Math.min(255, (r + globalLift + oceanLift * 0.28) * saturationLift)
            data[i + 1] = Math.min(255, (g + globalLift + oceanLift * 0.62) * saturationLift)
            data[i + 2] = Math.min(255, (b + globalLift + oceanLift) * saturationLift)
        }

        ctx.putImageData(imageData, 0, 0)
        const processedTexture = new THREE.CanvasTexture(canvas)
        processedTexture.colorSpace = THREE.SRGBColorSpace
        processedTexture.wrapS = THREE.RepeatWrapping
        processedTexture.wrapT = THREE.ClampToEdgeWrapping
        processedTexture.anisotropy = 8
        processedTexture.needsUpdate = true
        return processedTexture
    }, [surfaceTexture, isDark, theme])

    return (
        <mesh>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial map={displayTexture} toneMapped={false} color="#ffffff" />
        </mesh>
    )
}

const nightVertexShader = `
    varying vec3 vNormal;

    void main() {
        vNormal = normalize(normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const nightFragmentShader = `
    uniform vec3 uSunDirection;
    uniform float uNightOpacity;
    varying vec3 vNormal;

    void main() {
        vec3 normal = normalize(vNormal);
        float sunDot = dot(normal, uSunDirection);
        float nightFactor = 1.0 - smoothstep(-0.105, 0.035, sunDot);
        vec3 nightColor = vec3(0.01, 0.015, 0.06);
        float terminatorGlow = smoothstep(-0.105, -0.02, sunDot) * smoothstep(0.07, -0.005, sunDot);
        float atmosphereRim = smoothstep(-0.18, -0.04, sunDot) * smoothstep(0.11, 0.005, sunDot);
        vec3 glowColor = vec3(1.0, 0.6, 0.15);
        vec3 atmosColor = vec3(0.45, 0.65, 1.0);
        vec3 color = nightColor * nightFactor + glowColor * terminatorGlow * 0.45 + atmosColor * atmosphereRim * 0.15;
        float alpha = nightFactor * uNightOpacity + terminatorGlow * 0.35 + atmosphereRim * 0.08;
        gl_FragColor = vec4(color, alpha);
    }
`

function NightOverlay({ isDark, sunDirection }: { isDark: boolean; sunDirection: THREE.Vector3 }) {
    const materialRef = useRef<THREE.ShaderMaterial>(null)
    const sunDirectionRef = useRef(sunDirection.clone())
    const nightOpacityRef = useRef(isDark ? 0.82 : 0.65)
    const uniforms = useMemo(() => ({
        uSunDirection: { value: sunDirection.clone() },
        uNightOpacity: { value: isDark ? 0.68 : 0.52 },
    }), [])

    useEffect(() => {
        sunDirectionRef.current.copy(sunDirection)
        if (materialRef.current) {
            materialRef.current.uniforms.uSunDirection.value.copy(sunDirection)
        }
    }, [sunDirection])

    useEffect(() => {
        nightOpacityRef.current = isDark ? 0.82 : 0.65
        if (materialRef.current) {
            materialRef.current.uniforms.uNightOpacity.value = nightOpacityRef.current
        }
    }, [isDark])

    useFrame(() => {
        if (!materialRef.current) return
        materialRef.current.uniforms.uSunDirection.value.copy(sunDirectionRef.current)
        materialRef.current.uniforms.uNightOpacity.value = nightOpacityRef.current
    })

    return (
        <mesh>
            <sphereGeometry args={[1.002, 64, 64]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={nightVertexShader}
                fragmentShader={nightFragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                side={THREE.FrontSide}
            />
        </mesh>
    )
}

function GlobePoleDecor({ isDark, theme }: { isDark: boolean; theme: ThemeMode }) {
    const ringY = 1.024
    const ringR = 0.048
    const { arcPoints, coneTip, coneQuat } = useMemo(() => {
        const pts: THREE.Vector3[] = []
        const arcLen = Math.PI * 2 - 0.5
        for (let i = 0; i <= 40; i++) {
            const th = (i / 40) * arcLen
            pts.push(new THREE.Vector3(ringR * Math.cos(th), ringY, -ringR * Math.sin(th)))
        }
        const last = pts[pts.length - 1]
        const prev = pts[pts.length - 2]
        const tangent = new THREE.Vector3().subVectors(last, prev).normalize()
        return {
            arcPoints: pts,
            coneTip: last.clone().add(tangent.clone().multiplyScalar(0.022)),
            coneQuat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent),
        }
    }, [])

    const rotStroke = isDark ? '#fdba74' : '#ea580c'
    const rotFill = rotStroke
    const nStroke = isDark ? '#e9d5ff' : theme === 'sepia' ? '#6b21a8' : '#4f46a5'
    const nFill = isDark ? '#d8b4fe' : theme === 'sepia' ? '#7c3aed' : '#6366d9'

    return (
        <group>
            <Line points={arcPoints} color={rotStroke} lineWidth={1.35} />
            <mesh position={coneTip} quaternion={coneQuat}>
                <coneGeometry args={[0.017, 0.038, 10]} />
                <meshBasicMaterial color={rotFill} transparent opacity={isDark ? 0.95 : 0.9} />
            </mesh>
            <Line points={[new THREE.Vector3(0, 1.002, 0), new THREE.Vector3(0, 1.142, 0)]} color={nStroke} lineWidth={1.5} />
            <mesh position={[0, 1.163, 0]}>
                <coneGeometry args={[0.02, 0.042, 12]} />
                <meshBasicMaterial color={nFill} transparent opacity={isDark ? 0.95 : 0.92} />
            </mesh>
        </group>
    )
}

function NorthPoleYearPathRing({
    earthPos,
    earthRadius,
    year,
    sunAnchorAngle,
    isDark,
    theme,
}: {
    earthPos: THREE.Vector3
    earthRadius: number
    year: number
    sunAnchorAngle: number
    isDark: boolean
    theme: ThemeMode
}) {
    const surfaceRadius = earthRadius * 1.014
    const ringY = earthPos.y + 1.16 * earthRadius
    const ringRadius = Math.sin(AXIAL_TILT_RAD) * surfaceRadius
    const summer = getProgressForDate(year, 5, 21)
    const dayColor = isDark ? '#fde68a' : theme === 'sepia' ? '#d97706' : '#eab308'
    const nightColor = isDark ? '#6b5c87' : theme === 'sepia' ? '#8b7aa5' : '#818cf8'
    const { daySegments, nightSegments } = useMemo(() => {
        const day: THREE.Vector3[][] = []
        const night: THREE.Vector3[][] = []
        const steps = 240
        const light = new THREE.Vector3(Math.cos(sunAnchorAngle), 0, -Math.sin(sunAnchorAngle)).normalize()
        let current: THREE.Vector3[] = []
        let currentIsDay = false
        let previousPoint: THREE.Vector3 | undefined
        let previousDot = 0

        const pointAt = (index: number) => {
            const progress = index / steps
            const angle = sunAnchorAngle - (progress - summer) * Math.PI * 2
            const point = new THREE.Vector3(
                earthPos.x + Math.cos(angle) * ringRadius,
                ringY,
                earthPos.z - Math.sin(angle) * ringRadius,
            )
            const normal = point.clone().sub(earthPos).normalize()
            return { point, dot: normal.dot(light) }
        }

        for (let i = 0; i <= steps; i++) {
            const { point, dot } = pointAt(i)
            const isDay = dot >= 0

            if (i === 0) {
                current = [point]
                currentIsDay = isDay
            } else if (isDay !== currentIsDay && previousPoint) {
                const t = Math.abs(previousDot) / (Math.abs(previousDot) + Math.abs(dot))
                const crossing = previousPoint.clone().lerp(point, Number.isFinite(t) ? t : 0.5)
                current.push(crossing)
                if (current.length > 1) (currentIsDay ? day : night).push(current)
                current = [crossing, point]
                currentIsDay = isDay
            } else {
                current.push(point)
            }

            previousPoint = point
            previousDot = dot
        }

        if (current.length > 1) (currentIsDay ? day : night).push(current)
        return { daySegments: day, nightSegments: night }
    }, [earthPos, ringRadius, ringY, summer, sunAnchorAngle])
    const fillCenter = useMemo(() => new THREE.Vector3(earthPos.x, ringY, earthPos.z), [earthPos.x, earthPos.z, ringY])
    const makeFillGeometry = useCallback((points: THREE.Vector3[]) => {
        const geometry = new THREE.BufferGeometry()
        const vertices: number[] = [fillCenter.x, fillCenter.y, fillCenter.z]
        const indices: number[] = []

        points.forEach((point) => {
            vertices.push(point.x, point.y, point.z)
        })
        for (let i = 1; i < points.length; i++) {
            indices.push(0, i, i + 1)
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()
        return geometry
    }, [fillCenter])
    const dayFills = useMemo(() => daySegments.filter((points) => points.length > 2).map(makeFillGeometry), [daySegments, makeFillGeometry])
    const nightFills = useMemo(() => nightSegments.filter((points) => points.length > 2).map(makeFillGeometry), [nightSegments, makeFillGeometry])

    return (
        <group>
            {nightFills.map((geometry, index) => (
                <mesh key={`night-fill-${index}`} renderOrder={-2}>
                    <primitive object={geometry} attach="geometry" />
                    <meshBasicMaterial color={nightColor} transparent opacity={isDark ? 0.14 : 0.1} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            ))}
            {dayFills.map((geometry, index) => (
                <mesh key={`day-fill-${index}`} renderOrder={-1}>
                    <primitive object={geometry} attach="geometry" />
                    <meshBasicMaterial color={dayColor} transparent opacity={isDark ? 0.18 : 0.13} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            ))}
            {nightSegments.map((points, index) => (
                <Line key={`north-night-${index}`} points={points} color={nightColor} lineWidth={2} transparent opacity={isDark ? 0.5 : 0.34} depthTest depthWrite={false} />
            ))}
            {daySegments.map((points, index) => (
                <Line key={`north-day-${index}`} points={points} color={dayColor} lineWidth={2.25} transparent opacity={isDark ? 0.96 : 0.86} depthTest depthWrite={false} />
            ))}
        </group>
    )
}

function EarthBody({
    mode,
    position,
    radius,
    isDark,
    theme,
    progress,
    sceneDate,
    rotationDate,
    rotationProgress,
    sunOrbitProgress,
    northDirection,
    homeCoords,
}: {
    mode: EarthVisualizationMode
    position: THREE.Vector3
    radius: number
    isDark: boolean
    theme: ThemeMode
    progress: number
    sceneDate: Date
    rotationDate: Date
    rotationProgress: number
    sunOrbitProgress: number
    northDirection?: THREE.Vector3
    homeCoords?: EarthCoords
}) {
    const year = sceneDate.getFullYear()
    const bodyRef = useRef<THREE.Group>(null)
    const scaleRef = useRef<THREE.Group>(null)
    const spinRef = useRef<THREE.Group>(null)
    const spinInitializedRef = useRef(false)
    const initialPosition = useRef(position.clone())
    const initialScale = useRef(radius)
    const scaleTarget = useMemo(() => new THREE.Vector3(radius, radius, radius), [radius])
    const tiltQuaternion = useMemo(() => (
        northDirection
            ? makeEarthTiltQuaternionForNorthDirection(northDirection)
            : makeEarthTiltQuaternion(year)
    ), [northDirection, year])
    const sunDirection = useMemo(() => getSunDirectionFromEarth(progress), [progress])
    const shaderSunDirection = useMemo(() => (
        rotateEclipticVector(sunDirection, sunOrbitProgress)
            .applyQuaternion(tiltQuaternion.clone().invert())
            .normalize()
    ), [sunDirection, sunOrbitProgress, tiltQuaternion])
    const spinSunDirection = useMemo(() => getSunDirectionFromEarth(rotationProgress), [rotationProgress])

    useEffect(() => {
        spinInitializedRef.current = false
    }, [mode])

    useFrame((_, delta) => {
        bodyRef.current?.position.lerp(position, 0.08)
        scaleRef.current?.scale.lerp(scaleTarget, 0.08)
        if (!spinRef.current) return
        if (!spinInitializedRef.current) {
            spinRef.current.rotation.y = getDailySpinAngle(rotationDate, tiltQuaternion, spinSunDirection)
            spinInitializedRef.current = true
        }
        if (mode === 'globe') {
            spinRef.current.rotation.y = getDailySpinAngle(rotationDate, tiltQuaternion, spinSunDirection)
        } else {
            spinRef.current.rotation.y += delta * 0.18
        }
    })

    return (
        <group ref={bodyRef} position={initialPosition.current}>
            <group ref={scaleRef} quaternion={tiltQuaternion} scale={initialScale.current}>
                <group ref={spinRef}>
                    <EarthTexture isDark={isDark} theme={theme} />
                    {mode === 'globe' && homeCoords && <LocalRotationPath coords={homeCoords} isDark={isDark} theme={theme} />}
                    {mode === 'globe' && <GlobePoleDecor isDark={isDark} theme={theme} />}
                </group>
                {mode === 'globe' ? (
                    <NightOverlay isDark={isDark} sunDirection={shaderSunDirection} />
                ) : (
                    <>
                        <Line
                            points={[new THREE.Vector3(0, -1.58, 0), new THREE.Vector3(0, 1.58, 0)]}
                            color={isDark ? '#94a3b8' : '#64748b'}
                            lineWidth={1}
                            transparent
                            opacity={0.55}
                            dashed
                            dashSize={0.05}
                            dashScale={8}
                            gapSize={0.03}
                        />
                        <EarthNorthArrowLocalYNorth earthRadius={1} isDark={isDark} />
                    </>
                )}
            </group>
        </group>
    )
}

function LocalRotationPath({ coords, isDark, theme }: { coords: EarthCoords; isDark: boolean; theme: ThemeMode }) {
    const pathColor = isDark ? '#fdba74' : theme === 'sepia' ? '#c2410c' : '#ea580c'
    const surfaceRadius = 1.018
    const homePoint = useMemo(() => latLngToEarthPoint(coords.lat, coords.lng, surfaceRadius), [coords.lat, coords.lng])
    const ringPoints = useMemo(() => {
        const points: THREE.Vector3[] = []
        for (let i = 0; i <= 144; i++) {
            points.push(latLngToEarthPoint(coords.lat, coords.lng + (i / 144) * 360, surfaceRadius))
        }
        return points
    }, [coords.lat, coords.lng])
    const arrow = useMemo(() => {
        const start = homePoint.clone()
        const direction = latLngToEarthPoint(coords.lat, coords.lng + 5, surfaceRadius)
            .sub(latLngToEarthPoint(coords.lat, coords.lng - 5, surfaceRadius))
            .normalize()
        const tip = start.clone().add(direction.clone().multiplyScalar(0.13))
        const coneHeight = 0.044
        return {
            start,
            tip,
            coneCenter: tip.clone().sub(direction.clone().multiplyScalar(coneHeight / 2)),
            coneHeight,
            coneQuaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
        }
    }, [coords.lat, coords.lng, homePoint])

    return (
        <group>
            <Line points={ringPoints} color={pathColor} lineWidth={1.2} transparent opacity={isDark ? 0.76 : 0.66} depthTest />
            <mesh position={homePoint}>
                <sphereGeometry args={[0.021, 16, 16]} />
                <meshBasicMaterial color={pathColor} transparent opacity={0.98} depthTest />
            </mesh>
            <Line points={[arrow.start, arrow.tip]} color={pathColor} lineWidth={1.55} transparent opacity={isDark ? 0.94 : 0.84} depthTest />
            <mesh position={arrow.coneCenter} quaternion={arrow.coneQuaternion}>
                <coneGeometry args={[0.015, arrow.coneHeight, 14]} />
                <meshBasicMaterial color={pathColor} transparent opacity={isDark ? 0.98 : 0.9} depthTest />
            </mesh>
        </group>
    )
}

function Sun({ position, radius, isDark, theme }: { position: THREE.Vector3; radius: number; isDark: boolean; theme: ThemeMode }) {
    const sunRef = useRef<THREE.Group>(null)
    const glowRef = useRef<THREE.Mesh>(null)
    const initialPosition = useRef(position.clone())
    const initialScale = useRef(radius)
    const scaleTarget = useMemo(() => new THREE.Vector3(radius, radius, radius), [radius])

    useFrame(({ clock }) => {
        sunRef.current?.position.lerp(position, 0.08)
        sunRef.current?.scale.lerp(scaleTarget, 0.08)
        if (glowRef.current) {
            const s = 1 + Math.sin(clock.getElapsedTime() * 1.5) * 0.08
            glowRef.current.scale.set(s, s, s)
        }
    })

    return (
        <group ref={sunRef} position={initialPosition.current} scale={initialScale.current}>
            <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshBasicMaterial color={isDark || theme === 'sepia' ? '#fbbf24' : '#f8c34a'} />
            </mesh>
            <mesh ref={glowRef}>
                <sphereGeometry args={[1.85, 32, 32]} />
                <meshBasicMaterial color={isDark || theme === 'sepia' ? '#fde68a' : '#fff2bd'} transparent opacity={isDark ? 0.14 : 0.09} />
            </mesh>
        </group>
    )
}

function OrbitAnnotations({ isDark, theme, progress }: { isDark: boolean; theme: ThemeMode; progress: number }) {
    const year = new Date().getFullYear()
    const { orbitPoints, colors, monthTicks, seasonTicks } = useMemo(() => {
        const pts: THREE.Vector3[] = []
        const cols: [number, number, number][] = []
        for (let i = 0; i <= 256; i++) {
            const p = i / 256
            pts.push(orbitPoint(p))
            const [r, g, b] = getSeasonColor(year, p)
            const lift = isDark ? 0 : theme === 'sepia' ? 0.04 : 0.08
            cols.push([Math.min(1, r + lift), Math.min(1, g + lift), Math.min(1, b + lift)])
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthTickData = months.map((label, index) => {
            const p = index / 12
            return {
                label,
                isQuarter: index % 3 === 0,
                inner: orbitPoint(p, ORBIT_RADIUS - 0.07),
                outer: orbitPoint(p, ORBIT_RADIUS + 0.07),
                pos: orbitPoint(p, ORBIT_RADIUS + 0.42),
            }
        })

        const seasonTickData = SEASON_EVENTS.map((event) => {
            const p = getProgressForDate(year, event.monthIndex, event.day)
            return {
                ...event,
                inner: orbitPoint(p, ORBIT_RADIUS - 0.09),
                outer: orbitPoint(p, ORBIT_RADIUS + 0.09),
                pos: orbitPoint(p, ORBIT_RADIUS + 0.73),
            }
        })

        return {
            orbitPoints: pts,
            colors: cols,
            monthTicks: monthTickData,
            seasonTicks: seasonTickData,
        }
    }, [isDark, theme, year])

    return (
        <group>
            <Line points={orbitPoints} vertexColors={colors} lineWidth={2.6} transparent opacity={isDark ? 0.82 : 0.68} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]}>
                <ringGeometry args={[ORBIT_RADIUS - 0.02, ORBIT_RADIUS + 0.02, 128]} />
                <meshBasicMaterial color={isDark ? '#1e293b' : theme === 'sepia' ? '#e2e8f0' : '#eef4fb'} transparent opacity={isDark ? 0.16 : 0.12} side={THREE.DoubleSide} />
            </mesh>
            {monthTicks.map((tick) => (
                <group key={tick.label}>
                    <Line points={[tick.inner, tick.outer]} color={isDark ? '#475569' : theme === 'sepia' ? '#94a3b8' : '#cbd5e1'} lineWidth={tick.isQuarter ? 2 : 1} />
                    <Text position={tick.pos} fontSize={0.12} color={isDark ? '#94a3b8' : theme === 'sepia' ? '#64748b' : '#6b7f99'} anchorX="center" anchorY="middle" rotation={[-Math.PI / 2, 0, 0]} outlineWidth={0.004} outlineColor={isDark ? '#0f172a' : '#ffffff'}>
                        {tick.label}
                    </Text>
                </group>
            ))}
            {seasonTicks.map((tick) => (
                <group key={tick.key}>
                    <Line points={[tick.inner, tick.outer]} color={tick.color} lineWidth={2} />
                    <Text position={tick.pos} fontSize={0.09} color={tick.color} anchorX="center" anchorY="middle" rotation={[-Math.PI / 2, 0, 0]} outlineWidth={0.004} outlineColor={isDark ? '#0f172a' : '#f8fafc'}>
                        {tick.label}
                    </Text>
                </group>
            ))}
        </group>
    )
}

function makeOrbitCylinderStrip(axis: THREE.Vector3, height: number, segmentCount: number) {
    const offset = axis.clone().normalize().multiplyScalar(height / 2)
    const vertices: number[] = []
    const indices: number[] = []
    const positiveEdge: THREE.Vector3[] = []
    const negativeEdge: THREE.Vector3[] = []

    for (let i = 0; i <= segmentCount; i++) {
        const base = orbitPoint(i / segmentCount)
        const positivePoint = base.clone().add(offset)
        const negativePoint = base.clone().sub(offset)
        positiveEdge.push(positivePoint)
        negativeEdge.push(negativePoint)
        vertices.push(positivePoint.x, positivePoint.y, positivePoint.z, negativePoint.x, negativePoint.y, negativePoint.z)

        if (i < segmentCount) {
            const topA = i * 2
            const bottomA = topA + 1
            const topB = topA + 2
            const bottomB = topA + 3
            indices.push(topA, bottomA, topB, bottomA, bottomB, topB)
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    return { geometry, positiveEdge, negativeEdge }
}

function OrbitTiltReferenceRings({ isDark, theme }: { isDark: boolean; theme: ThemeMode }) {
    const height = 1.05
    const segmentCount = 192
    const eclipticRingColor = isDark ? '#fbbf24' : theme === 'sepia' ? '#b45309' : '#d97706'
    const eclipticEdgeColor = isDark ? '#fde68a' : theme === 'sepia' ? '#92400e' : '#b45309'
    const eclipticNormalRing = useMemo(() => makeOrbitCylinderStrip(ECLIPTIC_NORTH, height, segmentCount), [height])

    return (
        <group>
            <mesh renderOrder={-2}>
                <primitive object={eclipticNormalRing.geometry} attach="geometry" />
                <meshBasicMaterial color={eclipticRingColor} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} depthTest />
            </mesh>
            <Line points={eclipticNormalRing.positiveEdge} color={eclipticEdgeColor} lineWidth={0.72} transparent opacity={isDark ? 0.34 : 0.26} depthWrite={false} depthTest />
            <Line points={eclipticNormalRing.negativeEdge} color={eclipticEdgeColor} lineWidth={0.72} transparent opacity={isDark ? 0.34 : 0.26} depthWrite={false} depthTest />
        </group>
    )
}

function SpiralAnnotations({ isDark, theme }: { isDark: boolean; theme: ThemeMode }) {
    const currentYear = new Date().getFullYear()
    const yearProgress = getOrbitalProgress(new Date())
    const nowT = (5 + yearProgress) / SPIRAL_TURNS
    const { pastPoints, pastColors, futurePoints, futureColors, monthTicks, seasonTicks, monthLabels, yearLabels } = useMemo(() => {
        const points: THREE.Vector3[] = []
        const colors: [number, number, number][] = []
        for (let i = 0; i < SPIRAL_POINTS; i++) {
            const t = i / (SPIRAL_POINTS - 1)
            points.push(pointOnSpiral(t))
            const turnProgress = Math.min(SPIRAL_TURNS - 0.0001, t * SPIRAL_TURNS)
            const turn = Math.floor(turnProgress)
            const localProgress = turnProgress - turn
            const [r, g, b] = getSeasonColor(currentYear - 5 + turn, localProgress)
            const lift = isDark ? 0 : theme === 'sepia' ? 0.04 : 0.08
            colors.push([Math.min(1, r + lift), Math.min(1, g + lift), Math.min(1, b + lift)])
        }
        const nowIndex = Math.max(1, Math.min(points.length - 2, Math.round(nowT * (points.length - 1))))

        const tickData: { points: [THREE.Vector3, THREE.Vector3]; isQuarter: boolean }[] = []
        const seasonData: { points: [THREE.Vector3, THREE.Vector3]; color: string; label: string; labelPos?: THREE.Vector3 }[] = []
        const monthLabelData: { pos: THREE.Vector3; label: string }[] = []
        const yearLabelData: { pos: THREE.Vector3; label: string }[] = []
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for (let turn = 0; turn < SPIRAL_TURNS; turn++) {
            const year = currentYear - 5 + turn
            for (let m = 0; m < 12; m++) {
                const p = getProgressForDate(year, m, 1)
                const t = (turn + p) / SPIRAL_TURNS
                const half = m % 3 === 0 ? 0.1 : 0.065
                const tickPoint = pointOnSpiral(t)
                tickData.push({
                    points: [withSpiralRadius(tickPoint, SPIRAL_RADIUS - half), withSpiralRadius(tickPoint, SPIRAL_RADIUS + half)],
                    isQuarter: m % 3 === 0,
                })
                if (turn === 5) {
                    const labelP = getMonthMidpointProgress(year, m)
                    monthLabelData.push({ pos: withSpiralRadius(pointOnSpiral((turn + labelP) / SPIRAL_TURNS), SPIRAL_RADIUS + 0.45), label: months[m] })
                }
            }
            for (const event of SEASON_EVENTS) {
                const p = getProgressForDate(year, event.monthIndex, event.day)
                const t = (turn + p) / SPIRAL_TURNS
                const base = pointOnSpiral(t)
                const radial = new THREE.Vector3(base.x, 0, base.z).normalize()
                seasonData.push({
                    points: [base.clone().sub(radial.clone().multiplyScalar(0.1)), base.clone().add(radial.clone().multiplyScalar(0.1))],
                    color: event.color,
                    label: event.label,
                    labelPos: turn === 5 ? base.clone().add(radial.clone().multiplyScalar(0.86)) : undefined,
                })
            }
            const yearBase = pointOnSpiral(turn / SPIRAL_TURNS)
            const yearRadial = new THREE.Vector3(yearBase.x, 0, yearBase.z).normalize()
            yearLabelData.push({ pos: yearBase.clone().add(yearRadial.multiplyScalar(0.64)), label: `${year}` })
        }

        return {
            pastPoints: points.slice(0, nowIndex + 1),
            pastColors: colors.slice(0, nowIndex + 1),
            futurePoints: points.slice(nowIndex),
            futureColors: colors.slice(nowIndex),
            monthTicks: tickData,
            seasonTicks: seasonData,
            monthLabels: monthLabelData,
            yearLabels: yearLabelData,
        }
    }, [currentYear, isDark, nowT, theme])

    const totalLength = SPIRAL_TURNS * SPIRAL_PITCH
    const pathPoints = useMemo(() => [
        new THREE.Vector3(0, -totalLength / 2 - 1, 0),
        new THREE.Vector3(0, totalLength / 2 + 1, 0),
    ], [totalLength])

    return (
        <group>
            <Line
                points={pathPoints}
                color={isDark ? '#fcd34d' : theme === 'sepia' ? '#f59e0b' : '#d5a43a'}
                lineWidth={1.5}
                transparent
                opacity={isDark ? 0.28 : 0.2}
                dashed
                dashSize={0.2}
                dashScale={2}
                gapSize={0.15}
            />
            <Line points={pastPoints} vertexColors={pastColors} lineWidth={3} />
            <Line points={futurePoints} vertexColors={futureColors} lineWidth={3} dashed dashSize={0.18} dashScale={1} gapSize={0.12} />
            {monthTicks.map((tick, i) => (
                <Line key={`month-${i}`} points={tick.points} color={isDark ? '#cbd5e1' : theme === 'sepia' ? '#7c6f58' : '#7f94ad'} lineWidth={tick.isQuarter ? 1.8 : 1.15} transparent opacity={isDark ? (tick.isQuarter ? 0.76 : 0.5) : (tick.isQuarter ? 0.62 : 0.4)} />
            ))}
            {seasonTicks.map((tick, i) => (
                <group key={`season-${i}`}>
                    <Line points={tick.points} color={tick.color} lineWidth={2} transparent opacity={isDark ? 0.92 : 0.78} />
                    {tick.labelPos && (
                        <Text position={tick.labelPos} fontSize={0.12} color={tick.color} anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor={isDark ? '#0f172a' : '#ffffff'}>
                            {tick.label}
                        </Text>
                    )}
                </group>
            ))}
            {monthLabels.map((item) => (
                <Text key={item.label} position={item.pos} fontSize={0.14} color={isDark ? '#94a3b8' : theme === 'sepia' ? '#64748b' : '#6b7f99'} anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor={isDark ? '#0f172a' : '#ffffff'}>
                    {item.label}
                </Text>
            ))}
            {yearLabels.map((item, i) => (
                <Text key={`${item.label}-${i}`} position={item.pos} fontSize={0.18} color={isDark ? '#e2e8f0' : theme === 'sepia' ? '#334155' : '#40566f'} anchorX="center" anchorY="middle" outlineWidth={0.008} outlineColor={isDark ? '#0f172a' : '#ffffff'}>
                    {item.label}
                </Text>
            ))}
        </group>
    )
}

function geologicColorForAge(ageMa: number) {
    if (ageMa >= 4000) return '#dc2626'
    if (ageMa >= 2500) return '#facc15'
    if (ageMa >= 538.8) return '#8b5cf6'
    if (ageMa >= 251.9) return '#22c55e'
    if (ageMa >= 66) return '#65a30d'
    return '#10b981'
}

function GalaxyDisk({ position, isDark }: { position: THREE.Vector3; isDark: boolean }) {
    const texture = useLoader(THREE.TextureLoader, '/assets/milky-way.jpg')

    useMemo(() => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        texture.repeat.set(GALAXY_TEXTURE_ZOOM, GALAXY_TEXTURE_ZOOM)
        texture.offset.set((1 - GALAXY_TEXTURE_ZOOM) / 2, (1 - GALAXY_TEXTURE_ZOOM) / 2)
        texture.needsUpdate = true
    }, [texture])

    return (
        <group position={position}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[GALAXY_DISK_SIZE, GALAXY_DISK_SIZE]} />
                <meshBasicMaterial map={texture} depthWrite={false} side={THREE.DoubleSide} transparent opacity={isDark ? 0.92 : 0.82} />
            </mesh>
        </group>
    )
}

function SolarSystemGlyph({
    position,
    centerDirection,
    motionDirection,
    isDark,
}: {
    position: THREE.Vector3
    centerDirection: THREE.Vector3
    motionDirection: THREE.Vector3
    isDark: boolean
}) {
    const orbitColor = isDark ? '#fde68a' : '#a16207'
    const motionColor = isDark ? '#93c5fd' : '#2563eb'
    const planetColor = isDark ? '#93c5fd' : '#2563eb'
    const basis = useMemo(() => {
        const u = centerDirection.clone().setY(0).normalize()
        const flatV = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), u).normalize()
        const v = flatV.clone().applyAxisAngle(u, -ECLIPTIC_TO_GALACTIC_RAD).normalize()
        return { u, v }
    }, [centerDirection.x, centerDirection.y, centerDirection.z])
    const ring = (radius: number) => {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= 56; i++) {
            const a = (i / 56) * Math.PI * 2
            pts.push(position.clone()
                .add(basis.u.clone().multiplyScalar(Math.cos(a) * radius))
                .add(basis.v.clone().multiplyScalar(Math.sin(a) * radius)))
        }
        return pts
    }
    const motionAxis = motionDirection.clone().setY(0).normalize()
    const motionEnd = position.clone().add(motionAxis.clone().multiplyScalar(0.42))
    const motionConeCenter = motionEnd.clone().sub(motionAxis.clone().multiplyScalar(0.035))
    const motionConeQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), motionAxis)

    return (
        <group>
            <Line points={[position.clone().sub(motionAxis.clone().multiplyScalar(0.36)), motionEnd]} color={motionColor} lineWidth={1.15} transparent opacity={0.74} />
            <mesh position={motionConeCenter} quaternion={motionConeQuaternion}>
                <coneGeometry args={[0.022, 0.06, 12]} />
                <meshBasicMaterial color={motionColor} transparent opacity={0.86} />
            </mesh>
            {[0.11, 0.18, 0.26].map((radius) => (
                <Line key={radius} points={ring(radius)} color={orbitColor} lineWidth={0.75} transparent opacity={isDark ? 0.62 : 0.5} />
            ))}
            <mesh position={position}>
                <sphereGeometry args={[0.052, 18, 18]} />
                <meshBasicMaterial color={isDark ? '#fde68a' : '#f59e0b'} transparent opacity={0.98} />
            </mesh>
            {[0.11, 0.18, 0.26].map((radius, index) => {
                const angle = [0.8, 2.45, 4.15][index]
                return (
                    <mesh
                        key={`planet-${radius}`}
                        position={position.clone()
                            .add(basis.u.clone().multiplyScalar(Math.cos(angle) * radius))
                            .add(basis.v.clone().multiplyScalar(Math.sin(angle) * radius))}
                    >
                        <sphereGeometry args={[index === 2 ? 0.024 : 0.018, 12, 12]} />
                        <meshBasicMaterial color={planetColor} transparent opacity={0.95} />
                    </mesh>
                )
            })}
        </group>
    )
}

function GalaxyHistoryModel({ isDark, theme }: { isDark: boolean; theme: ThemeMode }) {
    const outline = isDark ? '#020617' : '#ffffff'
    const [hoveredEventKey, setHoveredEventKey] = useState<string | null>(null)
    const decorativeEarthOrbit = useMemo(() => {
        const points: THREE.Vector3[] = []
        for (let i = 0; i <= GALAXY_EARTH_ORBIT_DECORATIVE_POINTS; i++) {
            const t = i / GALAXY_EARTH_ORBIT_DECORATIVE_POINTS
            const ageMa = EARTH_AGE_MA * (1 - t)
            const center = galaxyPoint(ageMa)
            const radial = center.clone().setY(0).normalize()
            const vertical = new THREE.Vector3(0, 1, 0)
            const phase = t * GALAXY_EARTH_ORBIT_DECORATIVE_TURNS * Math.PI * 2
            points.push(center.clone()
                .add(radial.multiplyScalar(Math.cos(phase) * GALAXY_EARTH_ORBIT_DECORATIVE_RADIUS))
                .add(vertical.multiplyScalar(Math.sin(phase) * GALAXY_EARTH_ORBIT_DECORATIVE_RADIUS)))
        }
        return points
    }, [])
    const pathData = useMemo(() => {
        const points: THREE.Vector3[] = []
        const colors: [number, number, number][] = []
        for (let i = 0; i <= 1200; i++) {
            const t = i / 1200
            const ageMa = EARTH_AGE_MA * (1 - t)
            points.push(galaxyPoint(ageMa))
            const c = new THREE.Color(geologicColorForAge(ageMa))
            colors.push([c.r, c.g, c.b])
        }
        return { points, colors }
    }, [])
    const futurePath = useMemo(() => {
        const points: THREE.Vector3[] = []
        for (let i = 0; i <= 900; i++) {
            const futureMa = FUTURE_PROJECTION_MA * (i / 900)
            points.push(galaxyPoint(-futureMa))
        }
        return points
    }, [])
    const orbitGhosts = useMemo(() => {
        const rings: THREE.Vector3[][] = []
        const totalTurns = GALACTIC_TURNS + FUTURE_PROJECTION_MA / GALACTIC_YEAR_MA
        for (let turn = 0; turn <= Math.floor(totalTurns); turn += 2) {
            const t = turn / GALACTIC_TURNS
            const y = (t - 0.5) * GALAXY_HISTORY_HEIGHT
            const ring: THREE.Vector3[] = []
            for (let i = 0; i <= 96; i++) {
                const a = (i / 96) * Math.PI * 2
                ring.push(new THREE.Vector3(Math.cos(a) * GALAXY_ORBIT_RADIUS, y, -Math.sin(a) * GALAXY_ORBIT_RADIUS))
            }
            rings.push(ring)
        }
        return rings
    }, [])
    const labelFont = (level: typeof GEO_SCALE_LABELS[number]['level']) => {
        if (level === 'eon') return 0.16
        if (level === 'era') return 0.105
        if (level === 'period') return 0.074
        return 0.058
    }
    const labelOffset = (level: typeof GEO_SCALE_LABELS[number]['level']) => {
        if (level === 'eon') return 1.75
        if (level === 'era') return 1.15
        if (level === 'period') return 0.72
        return 0.42
    }
    const eventTick = (level: typeof GEO_SCALE_LABELS[number]['level']) => {
        if (level === 'eon') return { inner: -0.12, outer: 0.24, width: 1.8, radius: 0.034, opacity: 0.95 }
        if (level === 'era') return { inner: -0.08, outer: 0.18, width: 1.3, radius: 0.024, opacity: 0.86 }
        if (level === 'period') return { inner: -0.05, outer: 0.13, width: 0.95, radius: 0.017, opacity: 0.76 }
        return { inner: -0.035, outer: 0.095, width: 0.72, radius: 0.012, opacity: 0.66 }
    }
    const presentPoint = galaxyPoint(0)
    const presentCenterDirection = presentPoint.clone().multiplyScalar(-1).setY(0).normalize()
    const presentMotionDirection = galaxyMotionDirection(0)
    const futureEndPoint = galaxyPoint(-FUTURE_PROJECTION_MA)
    return (
        <group>
            <GalaxyDisk position={new THREE.Vector3(0, -GALAXY_HISTORY_HEIGHT / 2 - 0.32, 0)} isDark={isDark} />
            <Line
                points={[new THREE.Vector3(0, -GALAXY_HISTORY_HEIGHT / 2 - 0.5, 0), new THREE.Vector3(0, futureEndPoint.y + 0.5, 0)]}
                color={isDark ? '#64748b' : '#94a3b8'}
                lineWidth={1}
                transparent
                opacity={0.3}
                dashed
                dashSize={0.14}
                dashScale={5}
                gapSize={0.08}
            />
            {orbitGhosts.map((ring, index) => (
                <Line key={`galactic-ring-${index}`} points={ring} color={isDark ? '#334155' : '#cbd5e1'} lineWidth={0.55} transparent opacity={isDark ? 0.16 : 0.2} />
            ))}
            <Line points={decorativeEarthOrbit} color={isDark ? '#94a3b8' : '#64748b'} lineWidth={1.1} transparent opacity={0.3} />
            <Line points={pathData.points} vertexColors={pathData.colors} lineWidth={3.3} />
            <Line points={futurePath} color={isDark ? '#fbbf24' : '#d97706'} lineWidth={2.1} transparent opacity={0.5} dashed dashSize={0.14} dashScale={4} gapSize={0.08} />
            {GEO_SCALE_LABELS.map((item) => {
                const tick = eventTick(item.level)
                const eventKey = `${item.level}-${item.label}`
                const isHovered = hoveredEventKey === eventKey
                const showConnector = item.level === 'period' || item.level === 'epoch'
                return (
                    <group key={`start-tick-${eventKey}`}>
                        {showConnector && (
                            <Line
                                points={[
                                    galaxyRadialOffset(item.ageMa, tick.inner),
                                    galaxyRadialOffset(item.ageMa, isHovered ? tick.outer + 0.09 : tick.outer),
                                ]}
                                color={item.color}
                                lineWidth={isHovered ? tick.width + 1.15 : tick.width}
                                transparent
                                opacity={isHovered ? 1 : tick.opacity}
                            />
                        )}
                        <mesh position={galaxyPoint(item.ageMa)}>
                            <sphereGeometry args={[isHovered ? tick.radius * 1.75 : tick.radius, 16, 16]} />
                            <meshBasicMaterial color={item.color} transparent opacity={isHovered ? 1 : tick.opacity} />
                        </mesh>
                    </group>
                )
            })}
            {GEO_SCALE_LABELS.filter((item) => item.level === 'period' || item.level === 'epoch').map((item) => {
                const eventKey = `${item.level}-${item.label}`
                const isHovered = hoveredEventKey === eventKey
                return (
                    <Billboard
                        key={eventKey}
                        position={galaxyLabelOffset(item.ageMa, labelOffset(item.level))}
                        scale={isHovered ? 1.12 : 1}
                    >
                        <Text
                            fontSize={labelFont(item.level)}
                            color={isHovered ? '#ffffff' : item.color}
                            anchorX="center"
                            anchorY="middle"
                            lineHeight={0.86}
                            outlineWidth={isHovered ? 0.01 : 0.0035}
                            outlineColor={isHovered ? item.color : outline}
                            onPointerOver={(event) => {
                                event.stopPropagation()
                                setHoveredEventKey(eventKey)
                            }}
                            onPointerOut={() => setHoveredEventKey(null)}
                        >
                            {`${item.label}\n${formatEarthAge(ageMaToEarthAge(item.ageMa))}\n${item.summary}`}
                        </Text>
                    </Billboard>
                )
            })}
            {FUTURE_EARTH_EVENTS.map((item) => {
                const ageMa = -item.yearsFromNowMa
                const point = galaxyPoint(ageMa)
                const eventKey = `future-${item.label}`
                const isHovered = hoveredEventKey === eventKey
                return (
                    <group key={eventKey}>
                        <Line
                            points={[
                                galaxyRadialOffset(ageMa, -0.07),
                                galaxyRadialOffset(ageMa, isHovered ? 0.52 : 0.42),
                            ]}
                            color={item.color}
                            lineWidth={isHovered ? 2.5 : 1.35}
                            transparent
                            opacity={isHovered ? 1 : 0.88}
                        />
                        <mesh position={point}>
                            <sphereGeometry args={[isHovered ? 0.047 : 0.027, 16, 16]} />
                            <meshBasicMaterial color={item.color} transparent opacity={isHovered ? 1 : 0.92} />
                        </mesh>
                        <Billboard position={galaxyLabelOffset(ageMa, 0.86)} scale={isHovered ? 1.12 : 1}>
                            <Text
                                fontSize={0.072}
                                color={isHovered ? '#ffffff' : item.color}
                                anchorX="center"
                                anchorY="middle"
                                lineHeight={0.86}
                                outlineWidth={isHovered ? 0.01 : 0.0035}
                                outlineColor={isHovered ? item.color : outline}
                                onPointerOver={(event) => {
                                    event.stopPropagation()
                                    setHoveredEventKey(eventKey)
                                }}
                                onPointerOut={() => setHoveredEventKey(null)}
                            >
                                {`${item.label}\n${formatEarthAge(EARTH_AGE_MA + item.yearsFromNowMa)}\n${item.summary}`}
                            </Text>
                        </Billboard>
                    </group>
                )
            })}
            <SolarSystemGlyph position={presentPoint} centerDirection={presentCenterDirection} motionDirection={presentMotionDirection} isDark={isDark} />
            <Billboard position={presentPoint.clone().add(new THREE.Vector3(0, 0.32, 0))}>
                <Text fontSize={0.12} color={isDark ? '#fde68a' : '#a16207'} anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor={outline}>
                    {`Solar System now\n${formatEarthAge(EARTH_AGE_MA)}`}
                </Text>
            </Billboard>
            <GalaxyTimeAxis isDark={isDark} theme={theme} hoveredEventKey={hoveredEventKey} setHoveredEventKey={setHoveredEventKey} />
        </group>
    )
}

function GalaxyTimeAxis({
    isDark,
    theme,
    hoveredEventKey,
    setHoveredEventKey,
}: {
    isDark: boolean
    theme: ThemeMode
    hoveredEventKey: string | null
    setHoveredEventKey: React.Dispatch<React.SetStateAction<string | null>>
}) {
    const axisColor = '#ffffff'
    const minorColor = isDark ? '#64748b' : theme === 'sepia' ? '#a8a29e' : '#cbd5e1'
    const labelColor = isDark ? '#e2e8f0' : theme === 'sepia' ? '#57534e' : '#334155'
    const outline = isDark ? '#020617' : '#ffffff'
    const x = -4.35
    const z = 0
    const axisStartEaMa = 0
    const axisEndEaMa = EARTH_AGE_MA + FUTURE_PROJECTION_MA
    const axisStartY = galaxyPoint(EARTH_AGE_MA).y
    const axisEndY = galaxyPoint(-FUTURE_PROJECTION_MA).y
    const majorTickLength = 0.24
    const minorTickLength = 0.1
    const majorAxisLineWidth = 3.0
    const minorAxisLineWidth = 3.0
    const solarSystemNowKey = 'axis-solar-system-now'
    const solarSystemNowColor = isDark ? '#fde68a' : '#a16207'
    const solarSystemNowY = galaxyPoint(0).y
    const solarSystemNowLabelY = solarSystemNowY + 0.24
    const isSolarSystemNowHovered = hoveredEventKey === solarSystemNowKey
    const eonEraMarkers = useMemo(
        () => GEO_SCALE_LABELS
            .filter((item) => item.level === 'eon' || item.level === 'era')
            .map((item) => ({
                ...item,
                eventKey: `${item.level}-${item.label}`,
                y: galaxyPoint(item.ageMa).y,
                labelY: galaxyPoint(item.ageMa).y + (item.level === 'era' && GEO_SCALE_LABELS.some((other) => other.level === 'eon' && other.ageMa === item.ageMa) ? 0.24 : 0),
                earthAge: ageMaToEarthAge(item.ageMa),
            })),
        [],
    )
    const ticks = useMemo(() => {
        const items: Array<{ eaMa: number; y: number; isMajor: boolean; isEndpoint: boolean }> = []
        for (let eaMa = axisStartEaMa; eaMa <= axisEndEaMa + 0.001; eaMa += 100) {
            const isEndpoint = Math.abs(eaMa - axisStartEaMa) < 0.001
            items.push({
                eaMa,
                y: galaxyPoint(EARTH_AGE_MA - eaMa).y,
                isMajor: eaMa % 1000 === 0,
                isEndpoint,
            })
        }
        return items
    }, [axisEndEaMa])
    return (
        <group>
            <Line
                points={[new THREE.Vector3(x, axisStartY, z), new THREE.Vector3(x, axisEndY, z)]}
                color={axisColor}
                lineWidth={majorAxisLineWidth}
                transparent
                opacity={1}
            />
            {ticks.map((tick) => {
                const tickLength = tick.isMajor || tick.isEndpoint ? majorTickLength : minorTickLength
                return (
                    <group key={`galaxy-time-${tick.eaMa}`}>
                        <Line
                            points={[new THREE.Vector3(x, tick.y, z), new THREE.Vector3(x + tickLength, tick.y, z)]}
                            color={tick.isMajor || tick.isEndpoint ? axisColor : '#ffffff'}
                            lineWidth={tick.isMajor || tick.isEndpoint ? majorAxisLineWidth : minorAxisLineWidth}
                            transparent
                            opacity={1}
                        />
                        {(tick.isMajor || tick.isEndpoint) && (
                            <Text
                                position={new THREE.Vector3(x - 0.16, tick.y, z)}
                                fontSize={tick.isEndpoint ? 0.12 : 0.105}
                                color={labelColor}
                                anchorX="right"
                                anchorY="middle"
                                outlineWidth={0.0035}
                                outlineColor={outline}
                            >
                                {formatEarthAge(tick.eaMa)}
                            </Text>
                        )}
                    </group>
                )
            })}
            {eonEraMarkers.map((item) => {
                const isHovered = hoveredEventKey === item.eventKey
                const isEon = item.level === 'eon'
                const markLength = isEon ? 0.62 : 0.48
                const markWidth = isHovered ? (isEon ? 4.7 : 3.6) : (isEon ? 3.2 : 2.4)
                const markerRadius = isHovered ? (isEon ? 0.045 : 0.034) : (isEon ? 0.032 : 0.023)
                const markerZ = isEon ? z + 0.025 : z + 0.05
                const labelX = x + 0.9
                const markerEndY = isEon ? item.y : item.labelY
                const hasKink = !isEon && Math.abs(item.labelY - item.y) > 0.001
                const markerPoints = hasKink
                    ? [
                        new THREE.Vector3(x, item.y, markerZ),
                        new THREE.Vector3(x + markLength * 0.55, markerEndY, markerZ),
                        new THREE.Vector3(x + markLength, markerEndY, markerZ),
                    ]
                    : [new THREE.Vector3(x, item.y, markerZ), new THREE.Vector3(x + markLength, markerEndY, markerZ)]
                return (
                    <group key={`axis-${item.eventKey}`}>
                        <Line
                            points={markerPoints}
                            color={item.color}
                            lineWidth={markWidth}
                            transparent
                            opacity={isHovered ? 1 : isEon ? 0.95 : 0.82}
                        />
                        <mesh position={new THREE.Vector3(x, item.y, markerZ)}>
                            <sphereGeometry args={[markerRadius, 16, 16]} />
                            <meshBasicMaterial color={item.color} transparent opacity={isHovered ? 1 : 0.94} />
                        </mesh>
                        <group position={new THREE.Vector3(labelX, item.labelY, z)} scale={isHovered ? 1.08 : 1}>
                            <Text
                                fontSize={isEon ? 0.096 : 0.068}
                                color={isHovered ? '#ffffff' : item.color}
                                anchorX="left"
                                anchorY="middle"
                                lineHeight={0.88}
                                outlineWidth={isHovered ? 0.008 : isEon ? 0.005 : 0.0035}
                                outlineColor={isHovered ? item.color : outline}
                                onPointerOver={(event) => {
                                    event.stopPropagation()
                                    setHoveredEventKey(item.eventKey)
                                }}
                                onPointerOut={() => setHoveredEventKey(null)}
                            >
                                {`${item.label}\n${formatEarthAge(item.earthAge)}\n${item.summary}`}
                            </Text>
                        </group>
                    </group>
                )
            })}
            <group>
                <Line
                    points={[
                        new THREE.Vector3(x, solarSystemNowY, z + 0.075),
                        new THREE.Vector3(x + 0.4, solarSystemNowLabelY, z + 0.075),
                        new THREE.Vector3(x + 0.72, solarSystemNowLabelY, z + 0.075),
                    ]}
                    color={solarSystemNowColor}
                    lineWidth={isSolarSystemNowHovered ? 4.4 : 3.0}
                    transparent
                    opacity={isSolarSystemNowHovered ? 1 : 0.96}
                />
                <mesh position={new THREE.Vector3(x, solarSystemNowY, z + 0.075)}>
                    <sphereGeometry args={[isSolarSystemNowHovered ? 0.046 : 0.033, 16, 16]} />
                    <meshBasicMaterial color={solarSystemNowColor} transparent opacity={isSolarSystemNowHovered ? 1 : 0.96} />
                </mesh>
                <group position={new THREE.Vector3(x + 0.9, solarSystemNowLabelY, z)} scale={isSolarSystemNowHovered ? 1.08 : 1}>
                    <Text
                        fontSize={0.092}
                        color={isSolarSystemNowHovered ? '#ffffff' : solarSystemNowColor}
                        anchorX="left"
                        anchorY="middle"
                        lineHeight={0.88}
                        outlineWidth={isSolarSystemNowHovered ? 0.008 : 0.005}
                        outlineColor={isSolarSystemNowHovered ? solarSystemNowColor : outline}
                        onPointerOver={(event) => {
                            event.stopPropagation()
                            setHoveredEventKey(solarSystemNowKey)
                        }}
                        onPointerOut={() => setHoveredEventKey(null)}
                    >
                        {`Solar System now\n${formatEarthAge(EARTH_AGE_MA)}`}
                    </Text>
                </group>
            </group>
            <Text
                position={new THREE.Vector3(x - 0.18, axisEndY + 0.32, z)}
                fontSize={0.12}
                color={labelColor}
                anchorX="right"
                anchorY="middle"
                lineHeight={0.9}
                outlineWidth={0.004}
                outlineColor={outline}
            >
                {`Earth Age\n(Years since formation of Earth)`}
            </Text>
        </group>
    )
}

function NorthPoleVectorArrow({
    center,
    radius,
    northDirection,
    color,
    isDark,
}: {
    center: THREE.Vector3
    radius: number
    northDirection: THREE.Vector3
    color: string
    isDark: boolean
}) {
    const arrow = useMemo(() => {
        const direction = northDirection.clone().setY(0).normalize()
        const start = center.clone().add(direction.clone().multiplyScalar(radius * 0.1))
        const tip = center.clone().add(direction.clone().multiplyScalar(radius * 0.74))
        const coneHeight = 0.038
        return {
            start,
            tip,
            coneCenter: tip.clone().sub(direction.clone().multiplyScalar(coneHeight / 2)),
            coneHeight,
            coneQuaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
        }
    }, [center, northDirection, radius])

    return (
        <group>
            <Line points={[arrow.start, arrow.tip]} color={color} lineWidth={1.25} transparent opacity={isDark ? 0.78 : 0.64} depthTest />
            <mesh position={arrow.coneCenter} quaternion={arrow.coneQuaternion}>
                <coneGeometry args={[0.012, arrow.coneHeight, 14]} />
                <meshBasicMaterial color={color} transparent opacity={isDark ? 0.9 : 0.78} depthTest />
            </mesh>
        </group>
    )
}

function GlobeSeasonHalo({
    isDark,
    theme,
    dateOffsetMs,
    rotationOffsetMs,
    sunOrbitProgress,
    sunOrbitActive,
    dateTextColor,
    timezone,
    timezoneRingScale,
    northDirection,
}: {
    isDark: boolean
    theme: ThemeMode
    dateOffsetMs: number
    rotationOffsetMs: number
    sunOrbitProgress: number
    sunOrbitActive: boolean
    dateTextColor: string
    timezone: string
    timezoneRingScale: number
    northDirection: THREE.Vector3
}) {
    const [baseNow, setBaseNow] = useState(() => new Date())
    const now = useMemo(() => new Date(baseNow.getTime() + dateOffsetMs), [baseNow, dateOffsetMs])
    const ringNow = useMemo(() => new Date(baseNow.getTime() + rotationOffsetMs), [baseNow, rotationOffsetMs])
    const displayDateNow = useMemo(() => (
        new Date(baseNow.getTime() + (sunOrbitActive ? sunOrbitProgress * DISPLAY_YEAR_MS : dateOffsetMs))
    ), [baseNow, dateOffsetMs, sunOrbitActive, sunOrbitProgress])
    const displayTimeNow = useMemo(() => (
        new Date(baseNow.getTime() + (sunOrbitActive ? -sunOrbitProgress * DAY_MS : rotationOffsetMs))
    ), [baseNow, rotationOffsetMs, sunOrbitActive, sunOrbitProgress])
    const year = now.getFullYear()
    const progress = getOrbitalProgress(now)
    const ringProgress = getOrbitalProgress(ringNow)
    const easternTimeLabel = useMemo(() => formatNowMarkerTime(displayTimeNow, EASTERN_TIMEZONE), [displayTimeNow])
    const easternTimeParts = useMemo(() => getTimePartsInTimezone(ringNow, EASTERN_TIMEZONE), [ringNow])
    const dateLabel = useMemo(() => formatSeasonHaloDate(displayDateNow), [displayDateNow])
    const center = new THREE.Vector3(0, 1.16, 0)
    const radius = Math.tan(AXIAL_TILT_RAD) * center.y
    const hourRadius = radius * 0.6
    const timezoneRadius = (hourRadius - 0.052) * timezoneRingScale
    const sunOrbitAngle = sunOrbitProgress * Math.PI * 2
    const sunOrbitQuaternion = useMemo(() => getEclipticRotationQuaternion(sunOrbitProgress), [sunOrbitProgress])
    const northAxis = useMemo(() => {
        const axis = northDirection.clone().setY(0).normalize().multiplyScalar(Math.sin(AXIAL_TILT_RAD))
        axis.y = Math.cos(AXIAL_TILT_RAD)
        return axis.normalize()
    }, [northDirection])
    const hourCenter = useMemo(() => northAxis.clone().multiplyScalar(1.024), [northAxis])
    const timezoneCenter = useMemo(() => northAxis.clone().multiplyScalar(1.024), [northAxis])
    const hourDiskQuaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), northAxis), [northAxis])
    const spring = getProgressForDate(year, 2, 20)
    const summer = getProgressForDate(year, 5, 21)
    const autumn = getProgressForDate(year, 8, 22)
    const winter = getProgressForDate(year, 11, 21)
    const sunAnchorAngle = useMemo(() => getSunAnchoredHaloAngle(), [])
    const hourBasis = useMemo(() => {
        const sunDirection = new THREE.Vector3(Math.cos(sunAnchorAngle), 0, -Math.sin(sunAnchorAngle))
        let u = sunDirection
            .projectOnPlane(northAxis)
            .negate()
        if (u.lengthSq() < 0.001) u = ECLIPTIC_NORTH.clone().projectOnPlane(northAxis)
        u.normalize()
        const v = new THREE.Vector3().crossVectors(northAxis, u).normalize()
        return { u, v }
    }, [northAxis, sunAnchorAngle])
    const tiltQuaternion = useMemo(() => makeEarthTiltQuaternionForNorthDirection(northDirection), [northDirection])
    const ringSunDirection = useMemo(() => getSunDirectionFromEarth(ringProgress), [ringProgress])
    const ringSpinAngle = useMemo(() => getDailySpinAngle(ringNow, tiltQuaternion, ringSunDirection), [ringNow, ringSunDirection, tiltQuaternion])
    const timezoneBasis = useMemo(() => {
        const u = new THREE.Vector3(1, 0, 0)
            .applyAxisAngle(ECLIPTIC_NORTH, ringSpinAngle)
            .applyQuaternion(tiltQuaternion)
            .projectOnPlane(northAxis)
            .normalize()
        const v = new THREE.Vector3(0, 0, -1)
            .applyAxisAngle(ECLIPTIC_NORTH, ringSpinAngle)
            .applyQuaternion(tiltQuaternion)
            .projectOnPlane(northAxis)
            .normalize()
        return { u, v }
    }, [northAxis, ringSpinAngle, tiltQuaternion])
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined
        const timeout = setTimeout(() => {
            setBaseNow(new Date())
            interval = setInterval(() => setBaseNow(new Date()), 60000)
        }, 60000 - (Date.now() % 60000))

        return () => {
            clearTimeout(timeout)
            if (interval) clearInterval(interval)
        }
    }, [])

    const point = useCallback((p: number, r = radius) => {
        const angle = sunAnchorAngle - (p - summer) * Math.PI * 2
        return new THREE.Vector3(center.x + Math.cos(angle) * r, center.y, center.z - Math.sin(angle) * r)
    }, [center.x, center.y, center.z, radius, summer, sunAnchorAngle])
    const arc = useCallback((start: number, end: number) => {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= 44; i++) {
            pts.push(point(start + (end - start) * (i / 44)))
        }
        return pts
    }, [point])
    const baseHourPoint = useCallback((hourProgress: number, r = hourRadius) => {
        const angle = hourProgress * Math.PI * 2
        return hourCenter.clone()
            .add(hourBasis.u.clone().multiplyScalar(Math.cos(angle) * r))
            .add(hourBasis.v.clone().multiplyScalar(Math.sin(angle) * r))
    }, [hourBasis, hourCenter, hourRadius])
    const hourPoint = useCallback((hourProgress: number, r = hourRadius) => {
        return baseHourPoint(hourProgress + sunOrbitProgress, r)
    }, [baseHourPoint, sunOrbitProgress])
    const timezonePoint = useCallback((hourProgress: number, r = hourRadius) => {
        const angle = hourProgress * Math.PI * 2
        return timezoneCenter.clone()
            .add(timezoneBasis.u.clone().multiplyScalar(Math.cos(angle) * r))
            .add(timezoneBasis.v.clone().multiplyScalar(Math.sin(angle) * r))
    }, [hourRadius, timezoneBasis, timezoneCenter])
    const hourArc = useMemo(() => {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= 96; i++) {
            pts.push(hourPoint(i / 96))
        }
        return pts
    }, [hourPoint])
    const localTimezoneOffset = getTimezoneOffsetHours(ringNow, timezone)
    const localTimezoneProgress = positiveModulo(localTimezoneOffset, 24) / 24
    const timezoneRingArc = useMemo(() => {
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= 128; i++) {
            pts.push(timezonePoint(i / 128, timezoneRadius))
        }
        return pts
    }, [timezonePoint, timezoneRadius])
    const timezoneTicks = useMemo(() => {
        return TIMEZONE_OFFSETS.map((offset) => {
            const zoneProgress = positiveModulo(offset, 24) / 24
            return {
                offset,
                progress: zoneProgress,
                isUtc: offset === 0,
                isLocal: Math.abs(offset - localTimezoneOffset) < 0.01,
            }
        })
    }, [localTimezoneOffset])

    const guideColor = isDark ? '#e9d5ff' : theme === 'sepia' ? '#7c3aed' : '#5b57c8'
    const outline = isDark ? '#0f172a' : '#ffffff'
    const monthTextColor = isDark ? '#c4b5fd' : theme === 'sepia' ? '#6d28d9' : '#6868b8'
    const current = point(progress)
    const sunVector = useMemo(() => {
        const direction = point(summer, 1).sub(center).setY(0).normalize()
        const start = center.clone().add(direction.clone().multiplyScalar(radius * 0.12))
        const tip = center.clone().add(direction.clone().multiplyScalar(radius * 0.68))
        const coneHeight = 0.045
        return {
            start,
            tip,
            coneCenter: tip.clone().sub(direction.clone().multiplyScalar(coneHeight / 2)),
            coneHeight,
            coneQuaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
            labelPos: center.clone().add(direction.clone().multiplyScalar(radius * 0.44)).add(new THREE.Vector3(0, 0.025, 0)),
        }
    }, [center, point, radius, summer])
    const northMotionArrow = useMemo(() => {
        const start = current.clone()
        const direction = point(progress + 0.018, radius).sub(point(progress - 0.018, radius)).normalize()
        const tip = start.clone().add(direction.clone().multiplyScalar(0.088))
        const coneHeight = 0.034
        return {
            start,
            tip,
            coneCenter: tip.clone().sub(direction.clone().multiplyScalar(coneHeight / 2)),
            coneHeight,
            coneQuaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
        }
    }, [current, point, progress, radius])
    const sunVectorColor = isDark ? '#fbbf24' : '#d97706'
    const currentMarkerColor = isDark ? '#d8b4fe' : '#4f46e5'
    const hourColor = isDark ? '#67e8f9' : '#0284c7'
    const hourTextColor = isDark ? '#a5f3fc' : '#0369a1'
    const localHourColor = isDark ? '#fdba74' : '#ea580c'
    const timezoneColor = isDark ? '#86efac' : '#15803d'
    const timezoneTextColor = isDark ? '#bbf7d0' : '#166534'
    const timezoneUtcColor = isDark ? '#fef08a' : '#a16207'
    const timezoneLocalColor = isDark ? '#f0abfc' : '#a21caf'
    const easternHourProgress = (easternTimeParts.hour + easternTimeParts.minute / 60 + easternTimeParts.second / 3600) / 24
    const easternHourMarkerPoint = baseHourPoint(easternHourProgress, hourRadius)
    const easternHourLabelPoint = baseHourPoint(easternHourProgress, hourRadius + 0.09)
    const easternHourMotionArrow = useMemo(() => {
        const start = easternHourMarkerPoint.clone()
        const direction = baseHourPoint(easternHourProgress + 0.018, hourRadius)
            .sub(baseHourPoint(easternHourProgress - 0.018, hourRadius))
            .normalize()
        const tip = start.clone().add(direction.clone().multiplyScalar(0.074))
        const coneHeight = 0.028
        return {
            start,
            tip,
            coneCenter: tip.clone().sub(direction.clone().multiplyScalar(coneHeight / 2)),
            coneHeight,
            coneQuaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
        }
    }, [baseHourPoint, easternHourMarkerPoint, easternHourProgress, hourRadius])

    return (
        <group>
            <mesh position={hourCenter} quaternion={hourDiskQuaternion}>
                <circleGeometry args={[hourRadius * 1.16, 64]} />
                <meshBasicMaterial color={hourColor} transparent opacity={isDark ? 0.075 : 0.055} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            <Line points={hourArc} color={hourColor} lineWidth={2.3} transparent opacity={isDark ? 0.95 : 0.86} depthTest />
            <Line points={timezoneRingArc} color={timezoneColor} lineWidth={1.05} transparent opacity={isDark ? 0.74 : 0.58} depthTest />
            {Array.from({ length: 24 }, (_, hour) => {
                const p = hour / 24
                const isMajor = hour % 6 === 0
                const isLabeled = hour % 3 === 0
                return (
                    <group key={`hour-${hour}`}>
                        <Line
                            points={[
                                hourPoint(p, hourRadius - (isMajor ? 0.024 : 0.014)),
                                hourPoint(p, hourRadius + (isMajor ? 0.022 : 0.013)),
                            ]}
                            color={hourColor}
                            lineWidth={isMajor ? 1.55 : 0.95}
                            transparent
                            opacity={isDark ? 0.88 : 0.68}
                            depthTest
                        />
                        {isLabeled && (
                            <Billboard position={hourPoint(p, hourRadius + 0.07)}>
                                <Text
                                    fontSize={isMajor ? 0.027 : 0.023}
                                    color={hourTextColor}
                                    anchorX="center"
                                    anchorY="middle"
                                    outlineWidth={0.0018}
                                    outlineColor={outline}
                                >
                                    {`${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? 'am' : 'pm'}`}
                                </Text>
                            </Billboard>
                        )}
                    </group>
                )
            })}
            {timezoneTicks.map(({ offset, progress: zoneProgress, isUtc, isLocal }) => {
                const color = isLocal ? timezoneLocalColor : isUtc ? timezoneUtcColor : timezoneColor
                const textColor = isLocal ? localHourColor : isUtc ? timezoneUtcColor : timezoneTextColor
                return (
                    <group key={`timezone-${offset}`}>
                        <Line
                            points={[
                                timezonePoint(zoneProgress, timezoneRadius - 0.026),
                                timezonePoint(zoneProgress, timezoneRadius + (isUtc || isLocal ? 0.032 : 0.014)),
                            ]}
                            color={color}
                            lineWidth={isUtc || isLocal ? 1.55 : 0.85}
                            transparent
                            opacity={isDark ? (isUtc || isLocal ? 0.98 : 0.72) : (isUtc || isLocal ? 0.92 : 0.6)}
                            depthTest
                        />
                        <Billboard position={timezonePoint(zoneProgress, timezoneRadius - 0.046)}>
                            <Text
                                fontSize={isUtc || isLocal ? 0.021 : 0.016}
                                color={textColor}
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.0016}
                                outlineColor={outline}
                            >
                                {formatTimezoneOffset(offset)}
                            </Text>
                        </Billboard>
                    </group>
                )
            })}
            <mesh position={easternHourMarkerPoint}>
                <sphereGeometry args={[0.018, 18, 18]} />
                <meshBasicMaterial color={localHourColor} transparent opacity={0.98} depthTest />
            </mesh>
            <Line points={[easternHourMotionArrow.start, easternHourMotionArrow.tip]} color={localHourColor} lineWidth={1.35} transparent opacity={isDark ? 0.92 : 0.82} depthTest />
            <mesh position={easternHourMotionArrow.coneCenter} quaternion={easternHourMotionArrow.coneQuaternion}>
                <coneGeometry args={[0.011, easternHourMotionArrow.coneHeight, 12]} />
                <meshBasicMaterial color={localHourColor} transparent opacity={isDark ? 0.96 : 0.88} depthTest />
            </mesh>
            <Billboard position={easternHourLabelPoint}>
                <Text fontSize={0.04} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#000000">
                    {easternTimeLabel}
                </Text>
            </Billboard>
            <NorthPoleVectorArrow center={center} radius={radius} northDirection={northDirection} color={currentMarkerColor} isDark={isDark} />
            <mesh position={current}>
                <sphereGeometry args={[0.018, 16, 16]} />
                <meshBasicMaterial color={currentMarkerColor} transparent opacity={0.98} depthTest />
            </mesh>
            <Line points={[northMotionArrow.start, northMotionArrow.tip]} color={currentMarkerColor} lineWidth={1.45} transparent opacity={isDark ? 0.9 : 0.78} depthTest />
            <mesh position={northMotionArrow.coneCenter} quaternion={northMotionArrow.coneQuaternion}>
                <coneGeometry args={[0.013, northMotionArrow.coneHeight, 14]} />
                <meshBasicMaterial color={currentMarkerColor} transparent opacity={isDark ? 0.96 : 0.88} depthTest />
            </mesh>
            <Billboard position={current.clone().add(new THREE.Vector3(0, 0.052, 0))}>
                <Text fontSize={0.035} color="#ffffff" anchorX="center" anchorY="bottom" outlineWidth={0.003} outlineColor="#000000">
                    {dateLabel}
                </Text>
            </Billboard>
            <group quaternion={sunOrbitQuaternion}>
                <mesh position={center} rotation={[-Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[radius * 1.18, 64]} />
                    <meshBasicMaterial color={isDark ? '#a78bfa' : '#818cf8'} transparent opacity={isDark ? 0.045 : 0.032} depthWrite={false} side={THREE.DoubleSide} />
                </mesh>
                <Line points={arc(0, 1)} color={guideColor} lineWidth={0.85} transparent opacity={isDark ? 0.42 : 0.32} depthTest />
                <Line points={[sunVector.start, sunVector.tip]} color={sunVectorColor} lineWidth={1.5} transparent opacity={isDark ? 0.86 : 0.76} depthTest />
                <mesh position={sunVector.coneCenter} quaternion={sunVector.coneQuaternion}>
                    <coneGeometry args={[0.017, sunVector.coneHeight, 16]} />
                    <meshBasicMaterial color={sunVectorColor} transparent opacity={isDark ? 0.94 : 0.86} depthTest />
                </mesh>
                <Billboard position={sunVector.labelPos}>
                    <Text fontSize={0.022} color={sunVectorColor} anchorX="center" anchorY="middle" outlineWidth={0.002} outlineColor={outline}>
                        Sun
                    </Text>
                </Billboard>
                {[
                    { points: arc(0, spring), color: '#38bdf8' },
                    { points: arc(spring, summer), color: '#22c55e' },
                    { points: arc(summer, autumn), color: '#facc15' },
                    { points: arc(autumn, winter), color: '#f97316' },
                    { points: arc(winter, 1), color: '#38bdf8' },
                ].map((item, i) => (
                    <Line key={i} points={item.points} color={item.color} lineWidth={2.8} transparent opacity={isDark ? 0.9 : 0.82} depthTest />
                ))}
                {SEASON_HALO_MONTHS.map((label, index) => {
                    const p = getProgressForDate(year, index, 1)
                    const labelP = getMonthMidpointProgress(year, index)
                    const isQuarterMonth = index % 3 === 0

                    return (
                        <group key={label}>
                            <Line
                                points={[
                                    point(p, radius - (isQuarterMonth ? 0.038 : 0.026)),
                                    point(p, radius + (isQuarterMonth ? 0.034 : 0.022)),
                                ]}
                                color={guideColor}
                                lineWidth={isQuarterMonth ? 1.55 : 1.05}
                                transparent
                                opacity={isDark ? 0.78 : 0.58}
                                depthTest
                            />
                            <Billboard position={point(labelP, radius + 0.112)}>
                                <Text
                                    fontSize={isQuarterMonth ? 0.028 : 0.024}
                                    color={monthTextColor}
                                    anchorX="center"
                                    anchorY="middle"
                                    outlineWidth={0.002}
                                    outlineColor={outline}
                                >
                                    {label}
                                </Text>
                            </Billboard>
                        </group>
                    )
                })}
                {SEASON_EVENTS.map((event) => {
                    const p = getProgressForDate(year, event.monthIndex, event.day)
                    return (
                        <group key={event.key}>
                            <Line points={[point(p, radius - 0.032), point(p, radius + 0.032)]} color={event.color} lineWidth={1.45} transparent opacity={isDark ? 0.92 : 0.78} depthTest />
                            <Billboard position={point(p, radius + 0.055)}>
                                <Text fontSize={0.022} color={event.color} anchorX="center" anchorY="middle" outlineWidth={0.0018} outlineColor={outline}>
                                    {event.key}
                                </Text>
                            </Billboard>
                        </group>
                    )
                })}
            </group>
        </group>
    )
}

function UnifiedScene({
    mode,
    isDark,
    theme,
    dateOffsetMs,
    rotationOffsetMs,
    sunOrbitProgress,
    sunOrbitActive,
    homeCoords,
    timezone,
    timezoneRingScale,
    orbitTiltView,
    orbitTiltStripsVisible,
    resetViewKey,
}: {
    mode: EarthVisualizationMode
    isDark: boolean
    theme: ThemeMode
    dateOffsetMs: number
    rotationOffsetMs: number
    sunOrbitProgress: number
    sunOrbitActive: boolean
    homeCoords?: EarthCoords
    timezone: string
    timezoneRingScale: number
    orbitTiltView: boolean
    orbitTiltStripsVisible: boolean
    resetViewKey: number
}) {
    const { camera } = useThree()
    const sceneDate = useMemo(() => new Date(Date.now() + dateOffsetMs), [dateOffsetMs])
    const rotationDate = useMemo(() => new Date(Date.now() + rotationOffsetMs), [rotationOffsetMs])
    const progress = getOrbitalProgress(sceneDate)
    const rotationProgress = getOrbitalProgress(rotationDate)
    const sunAnchorAngle = useMemo(() => getSunAnchoredHaloAngle(), [])
    const globeNorthDirection = useMemo(() => getSunAnchoredNorthDirection(sceneDate, sunAnchorAngle), [sceneDate, sunAnchorAngle])
    const yearProgress = progress
    const nowT = (5 + yearProgress) / SPIRAL_TURNS
    const earthPos = useMemo(() => {
        if (mode === 'globe') return new THREE.Vector3(0, 0, 0)
        if (mode === 'spiral') return pointOnSpiral(nowT)
        if (mode === 'galaxy') return galaxyPoint(0)
        return orbitPoint(progress)
    }, [mode, nowT, progress])
    const sunPos = useMemo(() => mode === 'spiral' ? new THREE.Vector3(0, earthPos.y, 0) : new THREE.Vector3(0, 0, 0), [earthPos.y, mode])
    const earthRadius = mode === 'globe' ? 1 : mode === 'orbit' ? 0.14 : 0.12
    const sunRadius = mode === 'orbit' ? 0.28 : 0.22
    const orbitDateLabel = useMemo(() => formatSeasonHaloDate(sceneDate), [sceneDate])
    const dateTextColor = isDark ? '#fde68a' : theme === 'sepia' ? '#a16207' : '#b7791f'
    const sunOrbitAngle = sunOrbitProgress * Math.PI * 2
    const sunOrbitQuaternion = useMemo(() => getEclipticRotationQuaternion(sunOrbitProgress), [sunOrbitProgress])
    const orbitViewQuaternion = useMemo(() => {
        if (mode !== 'orbit' || !orbitTiltView) return new THREE.Quaternion()
        return makeEarthTiltQuaternion(sceneDate.getFullYear()).invert()
    }, [mode, orbitTiltView, sceneDate])
    const controlsRef = useRef<any>(null)
    const controlsModeKey = `${mode}-${resetViewKey}`
    const desiredCamera = useMemo(() => getCameraPosition(mode), [mode])
    const desiredTarget = useMemo(() => {
        if (mode === 'galaxy') return new THREE.Vector3(0, (galaxyPoint(-FUTURE_PROJECTION_MA).y - GALAXY_HISTORY_HEIGHT / 2) / 2, 0)
        return new THREE.Vector3(0, 0, 0)
    }, [mode])
    const transitionRef = useRef({
        t: 1,
        fromCamera: desiredCamera.clone(),
        toCamera: desiredCamera.clone(),
        fromTarget: desiredTarget.clone(),
        toTarget: desiredTarget.clone(),
    })

    useEffect(() => {
        transitionRef.current = {
            t: 0,
            fromCamera: camera.position.clone(),
            toCamera: desiredCamera.clone(),
            fromTarget: controlsRef.current?.target.clone() ?? desiredTarget.clone(),
            toTarget: desiredTarget.clone(),
        }
    }, [camera, controlsModeKey, desiredCamera, desiredTarget])

    useFrame((_, delta) => {
        const transition = transitionRef.current
        if (transition.t < 1) {
            transition.t = Math.min(1, transition.t + delta * 1.55)
            const eased = transition.t * transition.t * (3 - 2 * transition.t)
            camera.position.lerpVectors(transition.fromCamera, transition.toCamera, eased)
            if (controlsRef.current) {
                controlsRef.current.target.lerpVectors(transition.fromTarget, transition.toTarget, eased)
                controlsRef.current.update()
            } else {
                camera.lookAt(transition.toTarget)
            }
        } else if (controlsRef.current && controlsRef.current.__modeKey !== controlsModeKey) {
            controlsRef.current.target.copy(desiredTarget)
            controlsRef.current.update()
            controlsRef.current.__modeKey = controlsModeKey
        }
    })

    return (
        <>
            <ambientLight intensity={mode === 'globe' ? (isDark ? 0.22 : 0.46) : (isDark ? 0.18 : 0.42)} />
            <directionalLight position={[5, 2, 5]} intensity={mode === 'globe' ? (isDark ? 0.55 : 0.78) : 0.22} color={isDark ? '#9ec4ff' : '#ffffff'} />
            <Stars isDark={isDark} theme={theme} />
            <group quaternion={orbitViewQuaternion}>
                <pointLight position={sunPos.toArray()} intensity={mode === 'globe' ? 0 : isDark ? 2.5 : 2} color={isDark || theme === 'sepia' ? '#fde68a' : '#fff4c2'} distance={16} decay={1.4} />
                {mode === 'globe' && <GlobeSeasonHalo isDark={isDark} theme={theme} dateOffsetMs={dateOffsetMs} rotationOffsetMs={rotationOffsetMs} sunOrbitProgress={sunOrbitProgress} sunOrbitActive={sunOrbitActive} dateTextColor={dateTextColor} timezone={timezone} timezoneRingScale={timezoneRingScale} northDirection={globeNorthDirection} />}
                {mode === 'orbit' && orbitTiltStripsVisible && <OrbitTiltReferenceRings isDark={isDark} theme={theme} />}
                {mode === 'orbit' && <OrbitAnnotations isDark={isDark} theme={theme} progress={progress} />}
                {mode === 'spiral' && <SpiralAnnotations isDark={isDark} theme={theme} />}
                {mode === 'galaxy' && <GalaxyHistoryModel isDark={isDark} theme={theme} />}
                {mode !== 'globe' && mode !== 'galaxy' && <Sun position={sunPos} radius={sunRadius} isDark={isDark} theme={theme} />}
                {(mode === 'orbit' || mode === 'spiral') && (
                    <Billboard position={sunPos.clone().add(new THREE.Vector3(0, sunRadius + 0.38, 0))}>
                        <Text fontSize={0.16} color={dateTextColor} anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor={isDark ? '#0f172a' : '#ffffff'}>
                            {orbitDateLabel}
                        </Text>
                    </Billboard>
                )}
                {mode !== 'globe' && mode !== 'galaxy' && (
                    <Line
                        points={[sunPos, earthPos]}
                        color={isDark ? '#ffffff' : '#000000'}
                        lineWidth={1}
                        transparent
                        opacity={isDark ? 0.14 : 0.08}
                        dashed
                        dashSize={0.08}
                        dashScale={3}
                        gapSize={0.06}
                    />
                )}
                {mode !== 'galaxy' && <EarthBody mode={mode} position={earthPos} radius={earthRadius} isDark={isDark} theme={theme} progress={progress} sceneDate={sceneDate} rotationDate={rotationDate} rotationProgress={rotationProgress} sunOrbitProgress={mode === 'globe' ? sunOrbitProgress : 0} northDirection={mode === 'globe' ? globeNorthDirection : undefined} homeCoords={homeCoords} />}
                {mode === 'globe' && (
                    <group quaternion={sunOrbitQuaternion}>
                        <NorthPoleYearPathRing earthPos={earthPos} earthRadius={earthRadius} year={sceneDate.getFullYear()} sunAnchorAngle={sunAnchorAngle} isDark={isDark} theme={theme} />
                    </group>
                )}
                {mode === 'spiral' && (
                    <Text position={[earthPos.x, earthPos.y + earthRadius + 0.18, earthPos.z]} fontSize={0.11} color={isDark || theme === 'sepia' ? '#60a5fa' : '#3f8fe8'} anchorX="center" anchorY="bottom" outlineWidth={0.004} outlineColor={isDark ? '#0f172a' : '#ffffff'}>
                        NOW
                    </Text>
                )}
            </group>
            <OrbitControls
                key={controlsModeKey}
                ref={controlsRef}
                enableZoom
                enablePan
                minDistance={mode === 'globe' ? 1.5 : mode === 'orbit' ? 1 : 2}
                maxDistance={mode === 'globe' ? 6 : mode === 'orbit' ? 10 : mode === 'galaxy' ? 24 : 18}
                rotateSpeed={0.5}
                zoomSpeed={0.55}
                panSpeed={0.55}
                autoRotate={false}
                minPolarAngle={mode === 'orbit' ? 0.1 : undefined}
                maxPolarAngle={mode === 'orbit' ? Math.PI - 0.1 : undefined}
            />
        </>
    )
}

function SceneBackground({ color }: { color: string }) {
    const { gl } = useThree()

    useEffect(() => {
        gl.setClearColor(color, 1)
    }, [color, gl])

    return null
}

interface UnifiedEarthViewProps {
    className?: string
    style?: React.CSSProperties
    mode: EarthVisualizationMode
    dateOffsetMs?: number
    rotationOffsetMs?: number
    sunOrbitProgress?: number
    sunOrbitActive?: boolean
    isDarkOverride?: boolean
    orbitTiltView?: boolean
    orbitTiltStripsVisible?: boolean
    resetViewKey?: number
    homeCoords?: EarthCoords
    timezone: string
    timezoneRingScale?: number
}

export function UnifiedEarthView({ className, style, mode, dateOffsetMs = 0, rotationOffsetMs = 0, sunOrbitProgress = 0, sunOrbitActive = false, isDarkOverride, orbitTiltView = false, orbitTiltStripsVisible = true, resetViewKey = 0, homeCoords, timezone, timezoneRingScale = 1 }: UnifiedEarthViewProps) {
    const { isDark, theme } = useAppContext()
    const [ready, setReady] = useState(false)
    const [contextResetKey, setContextResetKey] = useState(0)
    const sceneIsDark = isDarkOverride ?? isDark
    const bgColor = sceneIsDark ? '#0a0a12' : theme === 'sepia' ? '#fbf4e6' : '#ffffff'
    const initialCamera = getCameraPosition(mode)

    const handleCreated = useCallback((state: any) => {
        state.gl.setClearColor(bgColor, 1)
        const canvas = state.gl.domElement as HTMLCanvasElement
        const handleContextLost = (event: Event) => {
            event.preventDefault()
            setReady(false)
            window.setTimeout(() => {
                setContextResetKey((key) => key + 1)
            }, 80)
        }
        canvas.addEventListener('webglcontextlost', handleContextLost, { once: true })
        setReady(true)
    }, [bgColor])

    return (
        <div className={className} style={style}>
            <Canvas
                key={contextResetKey}
                camera={{ position: initialCamera.toArray(), fov: 48 }}
                onCreated={handleCreated}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
                style={{
                    background: bgColor,
                    opacity: ready ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                }}
            >
                <SceneBackground color={bgColor} />
                <UnifiedScene mode={mode} isDark={sceneIsDark} theme={theme} dateOffsetMs={dateOffsetMs} rotationOffsetMs={rotationOffsetMs} sunOrbitProgress={sunOrbitProgress} sunOrbitActive={sunOrbitActive} homeCoords={homeCoords} timezone={timezone} timezoneRingScale={timezoneRingScale} orbitTiltView={orbitTiltView} orbitTiltStripsVisible={orbitTiltStripsVisible} resetViewKey={resetViewKey} />
            </Canvas>
        </div>
    )
}
