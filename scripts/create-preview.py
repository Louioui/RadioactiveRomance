"""Original synthetic sound-design preview. This is not a band recording."""
import math, random, wave, struct
random.seed(7)
sr=22050; duration=32; buf=bytearray(); beat=60/160
for i in range(sr*duration):
 t=i/sr; b=t%beat; bar=int(t/(beat*8)); root=[55,46.249,65.406,48.999][bar%4]
 env=min(1,t/2,(duration-t)/3)
 drone=(math.sin(2*math.pi*root*t)+.3*math.sin(2*math.pi*root*1.5*t))*.07
 kick=math.sin(2*math.pi*(47*b+8*(1-math.exp(-b*35))))*math.exp(-b*21)*.48
 second=(b-beat*.5)
 if bar%2 and second>0: kick+=math.sin(2*math.pi*48*second)*math.exp(-second*28)*.28
 snare=(random.random()*2-1)*math.exp(-b*35)*.12 if int(t/beat)%2 else 0
 hat=(random.random()*2-1)*math.exp(-(t%(beat/2))*100)*.035
 shimmer=math.sin(2*math.pi*(root*8)*t)*(.4+.6*math.sin(t*.7)**2)*.018
 val=math.tanh((drone+kick+snare+hat+shimmer)*env)*.75
 buf.extend(struct.pack('<h',int(val*32767)))
with wave.open('public/assets/signal-preview.wav','wb') as f:
 f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes(buf)
