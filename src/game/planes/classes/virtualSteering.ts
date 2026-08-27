export const VIRTUAL_STICK_RADIUS = 110;
export const VIRTUAL_STICK_DEAD_ZONE = 0.08;

export interface VirtualSteering { x:number; y:number; axisX:number; axisY:number }

export function keyboardYaw(leftHeld:boolean, rightHeld:boolean): number {
  return Number(leftHeld)-Number(rightHeld);
}

export function virtualSteering(x:number, y:number, radius=VIRTUAL_STICK_RADIUS, deadZone=VIRTUAL_STICK_DEAD_ZONE): VirtualSteering {
  const safeRadius=Math.max(1,radius),magnitude=Math.hypot(x,y),clampScale=magnitude>safeRadius?safeRadius/magnitude:1;
  const clampedX=x*clampScale,clampedY=y*clampScale,normalizedMagnitude=Math.min(1,magnitude/safeRadius);
  if(normalizedMagnitude<=deadZone||magnitude===0)return{x:clampedX,y:clampedY,axisX:0,axisY:0};
  const linear=(normalizedMagnitude-deadZone)/(1-deadZone),response=linear*linear*(3-2*linear),directionMagnitude=Math.max(Math.hypot(clampedX,clampedY),1);
  return{x:clampedX,y:clampedY,axisX:clampedX/directionMagnitude*response,axisY:clampedY/directionMagnitude*response};
}
