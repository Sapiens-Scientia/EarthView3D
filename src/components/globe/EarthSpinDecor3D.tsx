import React, { useMemo } from 'react'
import { Line, Text } from '@react-three/drei'
import * as THREE from 'three'

const ROTATION_ARC_SEGMENTS = 56
const ROTATION_ARROW_GAP = 0.55
const AXIAL_TILT_RAD = (23.44 * Math.PI) / 180
const SPIRAL_NORTH_AXIS = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(1, 0, 0), AXIAL_TILT_RAD).normalize()
const SPIRAL_EQUATOR_U = new THREE.Vector3(1, 0, 0).normalize()
const SPIRAL_EQUATOR_V = new THREE.Vector3().crossVectors(SPIRAL_NORTH_AXIS, SPIRAL_EQUATOR_U).normalize()

/** Decorative sizes scale from spiral reference radius 0.12 */
function decorScale(earthRadius: number) {
    return earthRadius / 0.12
}

function rotationColors(isDark: boolean) {
    return {
        stroke: isDark ? '#bae6fd' : '#0369a1',
        fill: isDark ? '#38bdf8' : '#0ea5e9',
    }
}

function northColors(isDark: boolean) {
    return {
        stroke: isDark ? '#e9d5ff' : '#6b21a8',
        fill: isDark ? '#d8b4fe' : '#7c3aed',
    }
}

/** Ring perpendicular to the tilted north axis used by the spiral / Z-time convention. */
export function EarthRotationRingWorldMinusZ({
    earthPos,
    earthRadius,
    isDark,
}: {
    earthPos: THREE.Vector3
    earthRadius: number
    isDark: boolean
}) {
    const sc = decorScale(earthRadius)
    const coneR = 0.034 * sc
    const coneH = 0.072 * sc

    const { arcPoints, conePos, coneQuat } = useMemo(() => {
        const sc = decorScale(earthRadius)
        const rr = earthRadius + 0.07 * sc
        const ahead = 0.028 * sc
        const arcLen = Math.PI * 2 - ROTATION_ARROW_GAP
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= ROTATION_ARC_SEGMENTS; i++) {
            const t = i / ROTATION_ARC_SEGMENTS
            const theta = t * arcLen
            const offset = SPIRAL_EQUATOR_U.clone()
                .multiplyScalar(rr * Math.cos(theta))
                .add(SPIRAL_EQUATOR_V.clone().multiplyScalar(rr * Math.sin(theta)))
            pts.push(earthPos.clone().add(offset))
        }
        const last = pts[pts.length - 1]
        const prev = pts[pts.length - 2]
        const tangent = new THREE.Vector3().subVectors(last, prev).normalize()
        const coneTip = last.clone().add(tangent.clone().multiplyScalar(ahead))
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
        return { arcPoints: pts, conePos: coneTip, coneQuat: quat }
    }, [earthPos.x, earthPos.y, earthPos.z, earthRadius])

    const c = rotationColors(isDark)
    return (
        <group>
            <Line points={arcPoints} color={c.stroke} lineWidth={2} />
            <mesh position={conePos} quaternion={coneQuat}>
                <coneGeometry args={[coneR, coneH, 12]} />
                <meshBasicMaterial color={c.fill} transparent opacity={isDark ? 0.95 : 0.9} />
            </mesh>
        </group>
    )
}

/** North tilted 23.44 degrees from the ecliptic normal in the spiral / Z-time convention. */
export function EarthNorthArrowWorldMinusZ({
    earthPos,
    earthRadius,
    isDark,
    flipLabel = false,
}: {
    earthPos: THREE.Vector3
    earthRadius: number
    isDark: boolean
    flipLabel?: boolean
}) {
    const sc = decorScale(earthRadius)
    const northConeR = 0.03 * sc

    const { shaftPoints, coneCenter, coneQuat, labelPos } = useMemo(() => {
        const scInner = decorScale(earthRadius)
        const shaft = 0.24 * scInner
        const cH = 0.065 * scInner
        const lSide = 0.12 * scInner
        const lLift = 0.06 * scInner
        const base = earthPos.clone().add(SPIRAL_NORTH_AXIS.clone().multiplyScalar(earthRadius))
        const shaftEnd = base.clone().add(SPIRAL_NORTH_AXIS.clone().multiplyScalar(shaft))
        const coneCenterW = shaftEnd.clone().add(SPIRAL_NORTH_AXIS.clone().multiplyScalar(cH / 2))
        const quat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            SPIRAL_NORTH_AXIS,
        )
        const labelPosW = shaftEnd.clone()
            .add(SPIRAL_NORTH_AXIS.clone().multiplyScalar(cH + lLift))
            .add(SPIRAL_EQUATOR_U.clone().multiplyScalar(lSide))
        return {
            shaftPoints: [base, shaftEnd],
            coneCenter: coneCenterW,
            coneQuat: quat,
            labelPos: labelPosW,
        }
    }, [earthPos.x, earthPos.y, earthPos.z, earthRadius])

    const c = northColors(isDark)
    return (
        <group>
            <Line points={shaftPoints} color={c.stroke} lineWidth={2} />
            <mesh position={coneCenter} quaternion={coneQuat}>
                <coneGeometry args={[northConeR, 0.065 * sc, 14]} />
                <meshBasicMaterial color={c.fill} transparent opacity={isDark ? 0.95 : 0.92} />
            </mesh>
            <Text
                position={labelPos}
                rotation={flipLabel ? [0, Math.PI, 0] : undefined}
                fontSize={0.1 * sc}
                color={c.stroke}
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.004 * sc}
                outlineColor={isDark ? '#0f172a' : '#f8fafc'}
            >
                North
            </Text>
        </group>
    )
}

/** Earth-centered local XZ equator; +ω about +Ŷ matches positive `rotation.y` (orbit view). */
export function EarthRotationRingLocalYNorth({ earthRadius, isDark }: { earthRadius: number; isDark: boolean }) {
    const sc = decorScale(earthRadius)
    const coneR = 0.034 * sc
    const coneH = 0.072 * sc

    const { arcPoints, conePos, coneQuat } = useMemo(() => {
        const scInner = decorScale(earthRadius)
        const ringR = earthRadius + 0.07 * scInner
        const ahead = 0.028 * scInner
        const arcLen = Math.PI * 2 - ROTATION_ARROW_GAP
        const pts: THREE.Vector3[] = []
        for (let i = 0; i <= ROTATION_ARC_SEGMENTS; i++) {
            const t = i / ROTATION_ARC_SEGMENTS
            const theta = t * arcLen
            pts.push(
                new THREE.Vector3(
                    ringR * Math.cos(theta),
                    0,
                    -ringR * Math.sin(theta),
                ),
            )
        }
        const last = pts[pts.length - 1]
        const prev = pts[pts.length - 2]
        const tangent = new THREE.Vector3().subVectors(last, prev).normalize()
        const coneTip = last.clone().add(tangent.clone().multiplyScalar(ahead))
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
        return { arcPoints: pts, conePos: coneTip, coneQuat: quat }
    }, [earthRadius])

    const c = rotationColors(isDark)
    return (
        <group>
            <Line points={arcPoints} color={c.stroke} lineWidth={2} />
            <mesh position={conePos} quaternion={coneQuat}>
                <coneGeometry args={[coneR, coneH, 12]} />
                <meshBasicMaterial color={c.fill} transparent opacity={isDark ? 0.95 : 0.9} />
            </mesh>
        </group>
    )
}

/** North along local +Y (tilted Earth in orbit view). */
export function EarthNorthArrowLocalYNorth({ earthRadius, isDark }: { earthRadius: number; isDark: boolean }) {
    const sc = decorScale(earthRadius)
    const northConeR = 0.03 * sc
    const northConeH = 0.065 * sc

    const { shaftPoints, coneCenter, labelPos } = useMemo(() => {
        const scInner = decorScale(earthRadius)
        const shaft = 0.24 * scInner
        const cH = 0.065 * scInner
        const lLift = 0.06 * scInner
        const lSide = 0.12 * scInner
        const base = new THREE.Vector3(0, earthRadius, 0)
        const shaftEnd = new THREE.Vector3(0, earthRadius + shaft, 0)
        const coneCenterW = new THREE.Vector3(0, shaftEnd.y + cH / 2, 0)
        const labelPosW = new THREE.Vector3(lSide, shaftEnd.y + cH + lLift, 0)
        return {
            shaftPoints: [base, shaftEnd],
            coneCenter: coneCenterW,
            labelPos: labelPosW,
        }
    }, [earthRadius])

    const c = northColors(isDark)
    return (
        <group>
            <Line points={shaftPoints} color={c.stroke} lineWidth={2} />
            <mesh position={coneCenter}>
                <coneGeometry args={[northConeR, northConeH, 14]} />
                <meshBasicMaterial color={c.fill} transparent opacity={isDark ? 0.95 : 0.92} />
            </mesh>
            <Text
                position={labelPos}
                fontSize={0.1 * sc}
                color={c.stroke}
                anchorX="left"
                anchorY="middle"
                outlineWidth={0.004 * sc}
                outlineColor={isDark ? '#0f172a' : '#f8fafc'}
            >
                North
            </Text>
        </group>
    )
}
