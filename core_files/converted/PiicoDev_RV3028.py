_G='falling'
_F='Parameter State must be True or False'
_E=None
_D='24'
_C=True
_B='little'
_A=False
from PiicoDev_Unified import *
compat_str='\nUnified PiicoDev library out of date.  Get the latest module: https://piico.dev/unified \n'
_dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
_I2C_ADDRESS=82
_SEC=0
_MIN=1
_HOUR=2
_DAY=4
_MONTH=5
_YEAR=6
_ALMIN=7
_STATUS=14
_CTRL1=15
_CTRL2=16
_CIM=18
_ECTRL=19
_SECTS=21
_DAYTS=24
_UNIX=27
_REG_ID=40
_EE_CLKOUT=53
_EE_BACKUP=55
def _setBit(x,n):return x|1<<n
def _clearBit(x,n):return x&~(1<<n)
def _writeBit(x,n,b):
	if b==0:return _clearBit(x,n)
	else:return _setBit(x,n)
def _readBit(x,n):return x&1<<n!=0
def _writeCrumb(x,n,c):x=_writeBit(x,n,_readBit(c,0));return _writeBit(x,n+1,_readBit(c,1))
def _writeTribit(x,n,c):x=_writeBit(x,n,_readBit(c,0));x=_writeBit(x,n+1,_readBit(c,1));return _writeBit(x,n+2,_readBit(c,2))
def _bcdDecode(val):return(val>>4)*10+(val&15)
def _bcdEncode(val):return val//10<<4|val%10
class PiicoDev_RV3028:
	def __init__(self,bus=_E,freq=_E,sda=_E,scl=_E,addr=_I2C_ADDRESS):
		try:
			if compat_ind>=1:0
			else:print(compat_str)
		except:print(compat_str)
		self.i2c=create_unified_i2c(bus=bus,freq=freq,sda=sda,scl=scl);self.addr=addr
		try:part=int(self.i2c.readfrom_mem(self.addr,_REG_ID,1)[0])
		except Exception as e:print(i2c_err_str.format(self.addr));raise e
		self._weekday=0;self.alarmHours=0;self.alarm_ampm='am';self.alarmMinutes=0;self.alarmWeekdayDate=0;self.setBatterySwitchover();self.configTrickleCharger();self.setTrickleCharger();self.getDateTime()
	@property
	def weekday(self):'Get the weekday and return as integer 0 to 6';return self._weekday
	@weekday.setter
	def weekday(self,day):
		'Set the weekday. Accepts an integer 0 to 6'
		if 0<=day<=6:self._weekday=day
		else:print('Warning: Weekday must be integer 0 to 6')
	@property
	def weekdayName(self):'Get the weekday and return as a string.';return _dayNames[self._weekday]
	@weekdayName.setter
	def weekdayName(self,day):
		'Set the weekday. Accepts a string, checks string is a day name, and stores as integer 0 to 6'
		if day in _dayNames:self._weekday=_dayNames.index(day)
		else:print('Warning: weekdayName must be "Monday", "Tuesday", ... "Saturday" or "Sunday"')
	def _read(self,reg,N):
		try:tmp=int.from_bytes(self.i2c.readfrom_mem(self.addr,reg,N),_B)
		except:print('Error reading from RV3028');return float('NaN')
		return tmp
	def _write(self,reg,data):
		try:self.i2c.writeto_mem(self.addr,reg,data)
		except:print('Error writing to RV3028');return float('NaN')
	def getUnixTime(self):return self._read(_UNIX,4)
	def setUnixTime(self,time):self._write(_UNIX,time.to_bytes(4,_B))
	def setBatterySwitchover(self,state=_C):
		tmp=self._read(_EE_BACKUP,1)
		if state is _C:tmp=_writeCrumb(tmp,2,1)
		elif state is _A:tmp=_writeCrumb(tmp,2,0)
		else:print(_F);return
		self._write(_EE_BACKUP,tmp.to_bytes(1,_B))
	def setTrickleCharger(self,state=_C):
		tmp=self._read(_EE_BACKUP,1)
		if state is _C:tmp=_writeBit(tmp,5,1)
		elif state is _A:tmp=_writeBit(tmp,5,0)
		else:print(_F);return
		self._write(_EE_BACKUP,tmp.to_bytes(1,_B))
	def configTrickleCharger(self,R='3k'):
		tmp=self._read(_EE_BACKUP,1);tmp=_setBit(tmp,7)
		if R=='3k':tmp=_writeCrumb(tmp,0,0)
		elif R=='5k':tmp=_writeCrumb(tmp,0,1)
		elif R=='9k':tmp=_writeCrumb(tmp,0,2)
		elif R=='15k':tmp=_writeCrumb(tmp,0,3)
		else:print("R parameter must be '3k', '5k', '9k', or '15k'");return
		self._write(_EE_BACKUP,tmp.to_bytes(1,_B))
	def configClockOutput(self,clk):
		tmp=self._read(_EE_CLKOUT,1)
		if clk==32768:tmp=_writeTribit(tmp,0,0)
		elif clk==8192:tmp=_writeTribit(tmp,0,1)
		elif clk==1024:tmp=_writeTribit(tmp,0,2)
		elif clk==64:tmp=_writeTribit(tmp,0,3)
		elif clk==32:tmp=_writeTribit(tmp,0,4)
		elif clk==1:tmp=_writeTribit(tmp,0,5)
		elif clk==0:tmp=_writeTribit(tmp,0,7)
		else:print('clk parameter must be 32678, 8192, 1024, 64,32, 1, or 0. Values are in units of Hz.');return
		self._write(_EE_CLKOUT,tmp.to_bytes(1,_B))
	def resetEventInterrupt(self,edge=_G):
		tmp=self._read(_STATUS,1);tmp=_clearBit(tmp,1);self._write(_STATUS,bytes([tmp]));tmp=self._read(_ECTRL,1);tmp=_clearBit(tmp,0)
		if edge==_G:tmp=_clearBit(tmp,6)
		else:tmp=_setBit(tmp,6)
		tmp=_clearBit(tmp,1);tmp=_setBit(tmp,2);self._write(_ECTRL,bytes([tmp]));tmp=self._read(_CTRL2,1);tmp=_setBit(tmp,2);tmp=_setBit(tmp,7);self._write(_CTRL2,bytes([tmp]));tmp=self._write(_ECTRL,bytes([0]))
	def getEventInterrupt(self):
		tmp=self._read(_STATUS,1)
		if _readBit(tmp,1)==1:return _C
		else:return _A
	def getDateTime(self,eventTimestamp=_A):
		if eventTimestamp is _A:tmp=self._read(_SEC,7);date=tmp.to_bytes(7,_B);self.day=_bcdDecode(date[4]);self.month=_bcdDecode(date[5]);self.year=_bcdDecode(date[6])
		else:tmp=self._read(_SECTS,6);date=tmp.to_bytes(6,_B);self.day=_bcdDecode(date[3]);self.month=_bcdDecode(date[4]);self.year=_bcdDecode(date[5])
		hrFormat=_readBit(self._read(_CTRL2,1),1);t=tmp.to_bytes(7,_B);self.minute=_bcdDecode(t[1]);self.second=_bcdDecode(t[0]);self.hour=_bcdDecode(t[2]);self._weekday=t[3];self.ampm=_D
		if hrFormat==1:
			if _readBit(t[2],5)==0:self.ampm='AM'
			else:hrByte=_clearBit(t[2],5);self.hour=_bcdDecode(hrByte);self.ampm='PM'
	def setDateTime(self):
		year_2_digits=self.year
		if year_2_digits>100:year_2_digits-=2000
		tmp=self._read(_CTRL2,1)
		if self.ampm==_D:tmp=_writeBit(tmp,1,0);hrs=_bcdEncode(self.hour)
		elif self.ampm!=_D:
			tmp=_writeBit(tmp,1,1);hrs=_bcdEncode(self.hour)
			if self.ampm=='AM':hrs=_clearBit(hrs,5)
			elif self.ampm=='PM':hrs=_setBit(hrs,5)
		self._write(_CTRL2,tmp.to_bytes(1,_B));self._write(_SEC,bytes([_bcdEncode(self.second),_bcdEncode(self.minute),hrs,self._weekday,_bcdEncode(self.day),_bcdEncode(self.month),_bcdEncode(year_2_digits)]))
	def alarmSetup(self,minutes=_A,hours=_A,weekday=_A,date=_A,interrupt=_C):
		'Push alarm settings to the RTC, enable alarm interrupt output as required. Arguments specify which time parameters to compare.';AE_M=1;AE_H=1;AE_WD=1
		if weekday and date:print('Warning: Cannot enable alarm for weeday AND date. Aborting...');return
		WADA=_A
		if weekday is not _A:WADA=_A;self.alarmWeekdayDate=int(weekday);AE_WD=0
		if date is not _A:WADA=_C;self.alarmWeekdayDate=int(date);AE_WD=0
		tmp=self._read(_CTRL1,1);tmp=_writeBit(tmp,5,WADA);self._write(_CTRL1,tmp.to_bytes(1,_B))
		if hours is not _A:self.alarmHours=int(hours);AE_H=0
		h=_bcdEncode(self.alarmHours)
		if self.ampm!=_D:ampm=self.alarm_ampm=='PM';h=_writeBit(h,5,ampm)
		if minutes is not _A:self.alarmMinutes=int(minutes);AE_M=0
		m=AE_M<<7|_bcdEncode(self.alarmMinutes);h=AE_H<<7|h;d=AE_WD<<7|_bcdEncode(self.alarmWeekdayDate);self._write(_ALMIN,bytes([m,h,d]));tmp=self._read(_CTRL2,1);tmp=_writeBit(tmp,3,interrupt);self._write(_CTRL2,tmp.to_bytes(1,_B))
	def alarmDisable(self):'Disable alarm, interrupt and clear the Alarm Flag if necessary';self.alarmSetup(minutes=_A,hours=_A,weekday=_A,date=_A,interrupt=_A);self.checkAlarm()
	def checkAlarm(self):
		'Return the Alarm Flag status, and reset if triggered';tmp=self._read(_STATUS,1)
		if _readBit(tmp,2):tmp=_writeBit(tmp,2,0);self._write(_STATUS,tmp.to_bytes(1,_B));return _C
		else:return _A
	def timestamp(self,eventTimestamp=_A):
		A='{:02d}';self.getDateTime(eventTimestamp=eventTimestamp);timestamp=A.format(self.year+2000)+'-'+A.format(self.month)+'-'+A.format(self.day)+' '+A.format(self.hour)+':'+A.format(self.minute)+':'+A.format(self.second)
		if self.ampm!=_D:timestamp+=' '+self.ampm
		return timestamp
	def clearAllInterrupts(self):self._write(_STATUS,bytes([0]))