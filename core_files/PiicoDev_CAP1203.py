_C=None
_B='NaN'
_A='big'
from PiicoDev_Unified import *
compat_str='\nUnified PiicoDev library out of date.  Get the latest module: https://piico.dev/unified \n'
_CAP1203Address=40
_MAIN_CONTROL=b'\x00'
_GENERAL_STATUS=b'\x02'
_SENSOR_INPUT_STATUS=b'\x03'
_SENSOR_INPUT_1_DELTA_COUNT=b'\x10'
_SENSOR_INPUT_2_DELTA_COUNT=b'\x11'
_SENSOR_INPUT_3_DELTA_COUNT=b'\x12'
_SENSITIVITY_CONTROL=b'\x1f'
_CONFIG=b' '
_INTERRUPT_ENABLE=b"'"
_REPEAT_RATE_ENABLE=b'('
_MULTIPLE_TOUCH_CONFIG=b'*'
_MULTIPLE_TOUCH_PATTERN_CONFIG=b'+'
_MULTIPLE_TOUCH_PATTERN=b'-'
_PRODUCT_ID=b'\xfd'
_PROD_ID_VALUE=b'm'
class PiicoDev_CAP1203:
	def __init__(self,bus=_C,freq=_C,sda=_C,scl=_C,addr=_CAP1203Address,touchmode='multi',sensitivity=3):
		A=b'\x80'
		try:
			if compat_ind>=1:0
			else:print(compat_str)
		except:print(compat_str)
		self.i2c=create_unified_i2c(bus=bus,freq=freq,sda=sda,scl=scl);self.addr=addr
		for i in range(0,1):
			try:
				if touchmode=='single':self.setBits(_MULTIPLE_TOUCH_CONFIG,A,A)
				if touchmode=='multi':self.setBits(_MULTIPLE_TOUCH_CONFIG,b'\x00',A)
				if sensitivity>=0 and sensitivity<=7:self.setBits(_SENSITIVITY_CONTROL,bytes([sensitivity*16]),b'p')
			except:print('connection failed');sleep_ms(1000)
	def setBits(self,address,byte,mask):
		old_byte=int.from_bytes(self.i2c.readfrom_mem(self.addr,int.from_bytes(address,_A),1),_A);temp_byte=old_byte;int_byte=int.from_bytes(byte,_A);int_mask=int.from_bytes(mask,_A)
		for n in range(8):
			bit_mask=int_mask>>n&1
			if bit_mask==1:
				if int_byte>>n&1==1:temp_byte=temp_byte|1<<n
				else:temp_byte=temp_byte&~(1<<n)
		new_byte=temp_byte;self.i2c.writeto_mem(self.addr,int.from_bytes(address,_A),bytes([new_byte]))
	def getSensitivity(self):sensitivity_control=self.i2c.readfrom_mem(self.addr,int.from_bytes(_SENSITIVITY_CONTROL,_A),1)
	def setSensitivity(self):self.i2c.writeto_mem(self.addr,int.from_bytes(_SENSITIVITY_CONTROL,_A),111)
	def clearInterrupt(self):self.i2c.writeto_mem(self.addr,int.from_bytes(_MAIN_CONTROL,_A),bytes([0]));main_control_value=self.i2c.readfrom_mem(self.addr,int.from_bytes(_MAIN_CONTROL,_A),1)
	def read(self):
		'\n        Get the status of each touch pad and return a dict. Dict keys match hardware pad labels\n        ';CS1return=0;CS2return=0;CS3return=0
		try:self.clearInterrupt();general_status_value=self.i2c.readfrom_mem(self.addr,int.from_bytes(_GENERAL_STATUS,_A),1)
		except:print(i2c_err_str.format(self.addr));return dict([(1,float(_B)),(2,float(_B)),(3,float(_B))])
		mask=1;value=mask&int.from_bytes(general_status_value,_A);sensor_input_status=self.i2c.readfrom_mem(self.addr,int.from_bytes(_SENSOR_INPUT_STATUS,_A),1);sts=int.from_bytes(sensor_input_status,_A);CS1=1&sts;CS2=2&sts;CS3=4&sts
		if CS1>0:CS1return=1
		if CS2>0:CS2return=1
		if CS3>0:CS3return=1
		return dict([(1,CS1return),(2,CS2return),(3,CS3return)])
	def readDeltaCounts(self):
		'\n        Get the raw sensor reading\n        ';DC1return=0;DC2return=0;DC3return=0
		try:DC1=self.i2c.readfrom_mem(self.addr,int.from_bytes(_SENSOR_INPUT_1_DELTA_COUNT,_A),1);DC2=self.i2c.readfrom_mem(self.addr,int.from_bytes(_SENSOR_INPUT_2_DELTA_COUNT,_A),1);DC3=self.i2c.readfrom_mem(self.addr,int.from_bytes(_SENSOR_INPUT_3_DELTA_COUNT,_A),1)
		except:print(i2c_err_str.format(self.addr));return dict([(1,float(_B)),(2,float(_B)),(3,float(_B))])
		return dict([(1,DC1),(2,DC2),(3,DC3)])