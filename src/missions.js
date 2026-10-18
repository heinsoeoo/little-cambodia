export class Missions {
 constructor(stops,saved={}){this.stops=stops;this.index=0;this.stage='pickup';this.balance=Math.max(0,Number(saved.balance)||0);this.trips=Math.max(0,Number(saved.trips)||0);}
 get target(){return this.stops[(this.index+(this.stage==='dropoff'?1:0))%this.stops.length];}
 canInteract(car){return Math.hypot(car.x-this.target.point[0],car.z-this.target.point[1])<=15&&Math.abs(car.speed)<=1.5;}
 interact(car){if(!this.canInteract(car))return null;if(this.stage==='pickup'){this.stage='dropoff';return 'pickup';}this.balance+=6000;this.trips++;this.stage='pickup';this.index=(this.index+1)%this.stops.length;return 'complete';}
 save(){return {balance:this.balance,trips:this.trips};}
}
