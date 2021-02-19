/*:
 * @target MZ
 * @plugindesc The pro version of HUD Maker Ultra. It works like an extension plugin, so please make sure SRD_HUDMakerUltra is still installed before this.
 * @author SRDude
 * @url https://srdude.itch.io/hud-maker-ultra-pro
 * @base SRD_HUDMakerUltra
 * @orderAfter SRD_HUDMakerUltra
 *
 * @command Set Current HUD
 * @text Set Current HUD
 * @desc The HUD main HUD used. Clears any existing HUDs.
 *
 * @arg HUD Name
 * @desc The name of the HUD to be switched to.
 * HUD names are configured in the HUD Maker Ultra editor.
 * @type text
 * @default
 *
 * @command Reset HUD
 * @text Reset HUD
 * @desc Resets the HUD back to the default one.
 *
 * @arg HUD Type
 * @desc Whether the map or battle HUD is reset.
 * "Current" refers to where the player is at the moment.
 * @type select
 * @option Current
 * @option Map
 * @option Battle
 * @default Current
 *
 * @help
 * ============================================================================
 *                              HUD Maker Ultra Pro
 *                                 Version 1.0.9
 *                                    SRDude
 * ============================================================================
 *
 * Adds additional features to HUD Maker and provides compatibility with
 * the HUD Maker Ultra Pro software.
 *
 * This plugin requires the "Pro" version of HUD Maker Ultra.
 * You can download it here:
 * http://sumrndm.site/hud-maker-ultra-pro
 *
 * ============================================================================
 *  End of Help File
 * ============================================================================
 *
 * Welcome to the bottom of the Help file. Thanks for reading!
 *
 * https://www.youtube.com/SumRndmDde
 * https://www.twitter.com/SumRndmDde
 * http://sumrndm.site
 *
 * Until next time,
 *   ~ SRDude
 */

var SRD = SRD || {};
SRD.HUDMakerUltraPro = SRD.HUDMakerUltraPro || {};

var Imported = Imported || {};
Imported.SRD_HUDMakerUltraPro = 0x010009; // 1.0.9

(function($) {

"use strict";

//=============================================================================
// * CheckDependencies
//=============================================================================
function CheckDependencies() {
	if(typeof Imported.SRD_HUDMakerUltra !== "number") {
		console.warn("SRD_HUDMakerUltraPro.js requires SRD_HUDMakerUltra.js to be installed!");
		return false;
	}

	if(Imported.SRD_HUDMakerUltra < 0x01000e) {
		const msg = "SRD_HUDMakerUltra.js requies an update! Please update to the latest version.";
		console.warn(msg);
		if(confirm(msg + "\nWould you like to open the download page (right-click -> save)?")) {
			const url = "https://raw.githubusercontent.com/SumRndmDde/HUDMakerUltra/main/SRD_HUDMakerUltra.js";
			if(Utils.isNwjs()) {
				require('nw.gui').Shell.openExternal(url);
			} else if(window && window.open) {
				window.open(url);
			}
		}
		return false;
	}

	if(SRD.HUDMakerUltra.hadError) {
		return false;
	}

	return true;
}

if(!CheckDependencies()) {
	$.hadError = true;
	return;
}

//=============================================================================
// * TouchInput.isMouseAboveWindow
//=============================================================================
if(TouchInput.isMouseAboveWindow === undefined) {
	if(Utils.isNwjs()) {
		TouchInput.isMouseAboveWindow = false;
		document.addEventListener("mouseout", function() { TouchInput.isMouseAboveWindow = false; });
		document.addEventListener("mouseover", function() { TouchInput.isMouseAboveWindow = true; });
	} else {
		TouchInput.isMouseAboveWindow = true;
	}
}

//=============================================================================
// * Game_UltraHUD
//=============================================================================
class Game_UltraHUD {
	initialize() {
		$.Game_UltraHUD.initialize.apply(this, arguments);
		this.initializeHUDIDs();
		this.resetHUDButtonClicked();
	}

	initializeHUDIDs() {
		this.resetMapID();
		this.resetBattleID();
	}

	resetHUDButtonClicked() {
		this._wasHUDButtonClicked = false;
	}

	setHUDButtonClicked() {
		this._wasHUDButtonClicked = true;
	}

	wasHUDButtonClicked() {
		return this._wasHUDButtonClicked;
	}

	mapHUDID() {
		return this._mapIndex;
	}

	battleHUDID() {
		return this._battleIndex;
	}

	resetCurrentID() {
		if($gameParty.inBattle()) {
			return this.resetBattleID();
		} else {
			return this.resetMapID();
		}
	}

	resetMapID() {
		if(this._mapIndex !== $dataUltraHUD.Map) {
			this._mapIndex = $dataUltraHUD.Map;
			return true;
		}
		return false;
	}

	resetBattleID() {
		if(this._battleIndex !== $dataUltraHUD.Battle) {
			this._battleIndex = $dataUltraHUD.Battle;
			return true;
		}
		return false;
	}

	setHUDByName(name) {
		const index = this.findHUDByName(name);
		if(index !== null && this.isValidScene()) {
			return this.setHUDIndex(index);
		}
		return false;
	}

	findHUDByName(name) {
		const dataLen = $dataUltraHUD.Data.length;
		for(let i = 0; i < dataLen; i++) {
			const hud = $dataUltraHUD.Data[i];
			if(hud && hud.IsHUD && hud.Name === name) {
				return i;
			}
		}
		return null;
	}

	setHUDIndex(id) {
		let changed = false;
		if($gameParty.inBattle()) {
			changed = this._battleIndex !== id;
			this._battleIndex = id;
		} else {
			changed = this._mapIndex !== id;
			this._mapIndex = id;
		}
		if(changed) {
			this.refreshHUD();
		}
		return changed;
	}
}

//=============================================================================
// * HUDMakerUltraProcessConfiguration
//=============================================================================
class HUDMakerUltraProcessConfiguration {
	initialize() {
		$.HUDMakerUltraProcessConfiguration.initialize.apply(this, arguments);
		this._existingComponentIDs = [];
		this._customParams = [];
	}

	processDynamicData(data, isNumber) {
		switch(data.Type) {
			case 0: return this.getCustomComponentParam(data.Param, isNumber);
			case 1: return $gameVariables.value(data.ID);
			case 2: {
				const func = SRD.UltraBase.convertStringToFunc(data.Code, "Dynamic Text Input Error", ["params"]);
				if(func !== null) {
					return func(this.getLatestParamsObject());
				}
			}
		}
		return $.HUDMakerUltraProcessConfiguration.processDynamicData(data, isNumber);
	}

	pushAllCustomComponentData(id, params) {
		if(id && params) {
			this.pushCustomComponentID(id);
			this.pushCustomComponentParams(params);
			return true;
		}
		return false;
	}

	popAllCustomComponentData() {
		this.popCustomComponentID();
		this.popCustomComponentParams();
	}

	pushCustomComponentID(id) {
		this._existingComponentIDs.push(id);
	}

	popCustomComponentID() {
		return this._existingComponentIDs.pop();
	}

	isCustomComponentParent(id) {
		return this._existingComponentIDs.includes(id);
	}

	pushCustomComponentParams(params) {
		this._customParams.push(params);
	}

	popCustomComponentParams() {
		return this._customParams.pop();
	}

	getCustomComponentParam(id, isNumber) {
		const params = this.getLatestParamsObject();
		if(params !== null) {
			if(id in params) {
				return params[id];
			}
		}
		return isNumber ? 0 : "";
	}

	getLatestParamsObject() {
		if(this._customParams.length > 0) {
			return this._customParams[this._customParams.length - 1];
		}
		return null;
	}

	getCustomFunctionParams() {
		const params = this.getLatestParamsObject();
		if(params !== null) {
			return [["params"],[params]];
		}
		return $.HUDMakerUltraProcessConfiguration.getCustomFunctionParams.apply(this, arguments);
	}
}

//=============================================================================
// * Stage_UltraHUDContainer
//=============================================================================
class Stage_UltraHUDContainer {
	update() {
		this.resetHUDButtonClickedSettings();
		$.Stage_UltraHUDContainer.update.apply(this, arguments);
	}

	resetHUDButtonClickedSettings() {
		$gameUltraHUD.resetHUDButtonClicked();
	}
}

//=============================================================================
// * Sprite_UltraHUD
//=============================================================================
class Sprite_UltraHUD_ {
	createHUDComponent(data) {
		switch(data.Type) {
			case 10: return new Sprite_UltraHUDComponent_CustomComponent(data, this, null, true);
			case 11: return new Sprite_UltraHUDComponent_CustomComponentCollection(data, this);
			case 12: return new Sprite_UltraHUDComponent_AttachComponentCollection(data, this);
			case 13: return new Sprite_UltraHUDComponent_Animation(data, this);
		}
		return $.Sprite_UltraHUD.createHUDComponent.apply(this, arguments);
	}
}

//=============================================================================
// * Sprite_UltraHUDComponent
//=============================================================================
class Sprite_UltraHUDComponent_ {
	initialize(data, hud) {
		$.Sprite_UltraHUDComponent.initialize.apply(this, arguments);
		this.setupAddons(data);
		this.startAddons();
		this.syncDisplayAnimationState();
	}

	createPrivateFields(data, hud) {
		$.Sprite_UltraHUDComponent.createPrivateFields.apply(this, arguments);
		this._addons = [];
		this._desiredVisibility = true;
		this.setupDisplayAnimations();
	}

	setupDisplayAnimations() {
		this._displayAnimations = new UltraHUDComponent_AnimationGroup();
		this._displayAnimations.onAllAnimationsComplete.run(this.syncDesiredVisibility.bind(this));
	}

	displayAnimationsExist() {
		return this._displayAnimations !== null && this._displayAnimations.isValid();
	}

	refreshComponentVisibility() {
		if(this.displayAnimationsExist()) {
			this.activateDisplayAnimations(this.shouldBeVisible());
		} else {
			$.Sprite_UltraHUDComponent.refreshComponentVisibility.apply(this, arguments);
		}
	}

	shouldBeVisible() {
		return this._forcedVisibility && (this._multiCondition === null || this._multiCondition.state);
	}

	activateDisplayAnimations(val) {
		if(val) {
			this.visible = true;
			this._desiredVisibility = true;
			this._displayAnimations.startAllAnimations(false);
		} else {
			this._desiredVisibility = false;
			this._displayAnimations.startAllAnimations(true);
		}
	}

	syncDesiredVisibility() {
		this.visible = this._desiredVisibility;
	}

	setupAddons(data) {
		const addons = data.Addons;
		if(addons && addons.length > 0) {
			const len = addons.length;
			for(let i = 0; i < len; i++) {
				const addon = this.createAddon(addons[i]);
				if(addon !== null) {
					this._addons.push(addon);
				}
			}
		}
	}

	createAddon(data) {
		if(data) {
			switch(data.Type) {
				case 1: { return new UltraHUDAddon_ColorFilter(data, this); }
				case 2: { return new UltraHUDAddon_Hover(data, this); }
				case 3: { return new UltraHUDAddon_Click(data, this); }
				case 4: { return new UltraHUDAddon_CodeProperty(data, this); }
				case 5: { return new UltraHUDAddon_CodeBehavior(data, this); }
			}
		}
		return null;
	}

	startAddons() {
		const len = this._addons.length;
		for(let i = 0; i < len; i++) {
			this._addons[i].start();
		}
	}

	onAnimationCreated(animation, animationData) {
		const activateType = animationData.ActivateType;
		switch(activateType.Type) {
			case 0: {
				switch(activateType.RunType) {
					case 1: {
						animation.start(true);
						break;
					}
					case 2: {
						this._displayAnimations.addAnimation(animation);
						break;
					}
					case 3: {
						this._addons.push(new UltraHUDAddon_Hover({ HoverType: 99, Animation: animation }, this));
						break;
					}
					case 4: {
						this._addons.push(new UltraHUDAddon_Click({ ClickType: 99, Animation: animation }, this));
						break;
					}
				}
				break;
			}
			case 1:
			case 2: {
				let data = null;
				switch(activateType.Type) {
					case 1: { data = { Type: 0, ID: activateType.ID, Value: true }; break; }
					case 2: { data = { Type: 9, Code: activateType.Code }; break; }
				}
				if(data !== null) {
					const condition = new UltraDynamicCondition(data, this._hud.getConfig());
					condition.onChange.run(animation.onAnimationConditionChanged.bind(animation));
					this._addons.push(condition);
				}
				break;
			}
			case 3: {
				const condition = new UltraDynamicMultiCondition(activateType.Conditions, this._hud.getConfig());
				condition.onChange.run(animation.onAnimationConditionChanged.bind(animation));
				this._addons.push(condition);
				break;
			}
		}
	}

	syncDisplayAnimationState() {
		if(this.displayAnimationsExist()) {
			this._displayAnimations.setImmediateState(!this.shouldBeVisible());
		}
	}

	update() {
		this.preUpdateAddons();
		$.Sprite_UltraHUDComponent.update.apply(this, arguments);
		this.updateAddons();
	}

	preUpdateAddons() {
		this._frameHovered = null
		this._frameClicked = null;
	}

	updateAddons() {
		const len = this._addons.length;
		for(let i = 0; i < len; i++) {
			this._addons[i].update();
		}
	}

	destroy() {
		$.Sprite_UltraHUDComponent.destroy.apply(this, arguments);
		this.destroyAddons();
		this.destroyDisplayAnimations();
	}

	destroyAddons() {
		const len = this._addons.length;
		for(let i = 0; i < len; i++) {
			this._addons[i].destroy();
		}
	}

	destroyDisplayAnimations() {
		this._displayAnimations = null;
	}

	isHovered() {
		if(this._frameHovered === null) {
			if(!TouchInput.isMouseAboveWindow) return false;
			const touchPos = new Point(TouchInput.x, TouchInput.y);
			const localPos = this.worldTransform.applyInverse(touchPos);
			this._frameHovered = this.boundingRect().contains(localPos.x, localPos.y);
		}
		return this._frameHovered;
	}

	onChildAdded(child) {
		const len = this._addons.length;
		for(let i = 0; i < len; i++) {
			if(this._addons[i].onChildAdded) {
				this._addons[i].onChildAdded(child);
			}
		}
	}

	findHUDData(id) {
		const dataLen = $dataUltraHUD.Data.length;
		for(let i = 0; i < dataLen; i++) {
			const hud = $dataUltraHUD.Data[i];
			if(hud && hud.ID === id) {
				return hud;
			}
		}
		return null;
	}
}

//=============================================================================
// * UltraDynamicCondition
//=============================================================================
class UltraDynamicCondition_ {
	createComponent() {
		switch(this._type) {
			case 10: { this._component = new UltraDynamicCondition_CustomComponentExists(this._data, this); break; }
			case 11: { this._component = new UltraDynamicCondition_CustomComponent(this._data, this); break; }
		}
		$.UltraDynamicCondition.createComponent.apply(this, arguments);
	}
}

//=============================================================================
// * UltraDynamicCondition_CustomComponentExists
//=============================================================================
class UltraDynamicCondition_CustomComponentExists extends UltraDynamicCondition_BaseComponent {
	createFields() {
		this._paramName = this._data.Param;
	}

	verify() {
		return typeof this._paramName === "string" && this._paramName.length > 0;
	}

	start() {
		this.checkForChange();
	}

	checkForChange() {
		const params = this._parent._config.getLatestParamsObject();
		if(params) {
			this._parent.setState(this._paramName in params);
		} else {
			this._parent.setState(false);
		}
	}
}

//=============================================================================
// * UltraDynamicCondition_CustomComponent
//=============================================================================
class UltraDynamicCondition_CustomComponent extends UltraDynamicCondition_BaseComponent {
	createFields() {
		this._paramName = this._data.Param;
		this._isString = this._data.IsString;
		this._operator = this._data.Op;
		this._value = this._data.Value;
	}

	verify() {
		return typeof this._paramName === "string" && this._paramName.length > 0 &&
			this._operator >= 0 && (this._isString ? (this._operator < 2) : (this._operator < 5));
	}

	start() {
		this.checkForChange();
	}

	checkForChange() {
		let result = false;
		const params = this._parent._config.getLatestParamsObject();
		if(params && this._paramName in params) {
			const value = params[this._paramName];
			if(this._isString) {
				switch(this._operator) {
					case 0: { result = value === this._value; break; }
					case 1: { result = value !== this._value; break; }
				}
			} else {
				switch(this._operator) {
					case 0: { result = value === this._value; break; }
					case 1: { result = value !== this._value; break; }
					case 2: { result = value <= this._value; break; }
					case 3: { result = value >= this._value; break; }
					case 4: { result = value < this._value; break; }
					case 5: { result = value > this._value; break; }
				}
			}
		}
		this._parent.setState(result);
	}
}

//=============================================================================
// * UltraDynamicText
//=============================================================================
class UltraDynamicText_ {
	createComponent() {
		$.UltraDynamicText.createComponent.apply(this, arguments);
		switch(this._type) {
			case 8: { this._component = new UltraDynamicValue_MathComponent(this._data, this, UltraDynamicValueTypes.TEXT); break; }
			case 9: { this._component = new UltraDynamicValue_ListComponent(this._data, this, UltraDynamicValueTypes.TEXT); break; }
		}
	}
}

//=============================================================================
// * UltraDynamicNumber
//=============================================================================
class UltraDynamicNumber_ {
	createComponent() {
		$.UltraDynamicNumber.createComponent.apply(this, arguments);
		switch(this._type) {
			case 8: { this._component = new UltraDynamicValue_MathComponent(this._data, this, UltraDynamicValueTypes.NUMBER); break; }
			case 9: { this._component = new UltraDynamicValue_ListComponent(this._data, this, UltraDynamicValueTypes.NUMBER); break; }
		}
	}
}

//=============================================================================
// * UltraDynamicValue_MathComponent
//=============================================================================
class UltraDynamicValue_MathComponent extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._dynamicNumberOne = null;
		this._dynamicNumberTwo = null;
		this._operator = this._data.Op;
	}

	verify() {
		return this._operator >= 0 && this._operator <= 11;
	}

	start() {
		this.setupNumberOne();
		this.setupNumberTwo();
		this.checkForChange();
	}

	onlyOne() {
		return this._operator >= 9;
	}

	setupNumberOne() {
		this._dynamicNumberOne = new UltraDynamicNumber(this._data.FirstNum, this._parent.getConfig());
		this._dynamicNumberOne.onChange.run(this.checkForChange.bind(this));
		this._dynamicNumberOne.start();
	}

	setupNumberTwo() {
		if(!this.onlyOne()) {
			this._dynamicNumberTwo = new UltraDynamicNumber(this._data.SecondNum, this._parent.getConfig());
			this._dynamicNumberTwo.onChange.run(this.checkForChange.bind(this));
			this._dynamicNumberTwo.start();
		}
	}

	checkForChange() {
		if(this._dynamicNumberOne === null) return;
		let result = null;
		const one = this._dynamicNumberOne.currentNumber;
		if(!this.onlyOne()) {
			if(this._dynamicNumberTwo === null) return;
			const two = this._dynamicNumberTwo.currentNumber;
			switch(this._operator) {
				case 0: { result = one + two; break; }
				case 1: { result = one - two; break; }
				case 2: { result = one * two; break; }
				case 3: { result = one / two; break; }
				case 4: { result = one % two; break; }
				case 5: { result = Math.pow(one, two); break; }
				case 6: { result = Math.min(one, two); break; }
				case 7: { result = Math.max(one, two); break; }
				case 8: { result = (Math.random() * (one - two)) + one; break; }
			}
		} else {
			switch(this._operator) {
				case 9: { result = Math.sqrt(one); break; }
				case 10: { result = Math.abs(one); break; }
				case 11: { result = Math.round(one); break; }
			}
		}
		if(result !== null) {
			if(this.isText()) {
				this._parent.setText(String(result));
			} else if(this.isNumber()) {
				this._parent.setNumber(result);
			}
		}
	}

	getUpdateComponent() {
		return this;
	}

	update() {
		this.checkForChange();
		if(this._dynamicNumberOne !== null) {
			this._dynamicNumberOne.update();
		}
		if(this._dynamicNumberTwo !== null) {
			this._dynamicNumberTwo.update();
		}
	}

	destroy() {
		if(this._dynamicNumberOne !== null) {
			this._dynamicNumberOne.destroy();
			this._dynamicNumberOne = null;
		}
		if(this._dynamicNumberTwo !== null) {
			this._dynamicNumberTwo.destroy();
			this._dynamicNumberTwo = null;
		}
	}
}

//=============================================================================
// * UltraDynamicValue_ListComponent
//=============================================================================
class UltraDynamicValue_ListComponent extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._dynamicList = null;
		this._operator = this._data.Op;
		this._frequency = this._parent.getConfig().processDynamicInput(this._data.Frequency || 60, true);
		if(this._operator > 0) {
			this._currentIndex = 0;
			this._duration = 0;
		}
	}

	verify() {
		return this._operator >= 0 && this._operator <= 2 && (this._operator === 0 || this._frequency > 0);
	}

	start() {
		this.setupDynamicList();
		this.checkForChange();
	}

	setupDynamicList() {
		this._dynamicList = new UltraDynamicList(this._data.ListData, this._parent.getConfig());
		this._dynamicList.onChange.run(this.checkForChange.bind(this));
		this._dynamicList.start();
	}

	checkForChange(newList) {
		if(newList) {
			this._currentIndex = this.resetIndex();
			this.resetDuration();
		}
		let result = null;
		if(this._dynamicList !== null) {
			const list = this._dynamicList.currentList;
			if(list === null || list.length === 0) {
				if(this.isText()) {
					this._parent.setText("");
				} else if(this.isNumber()) {
					this._parent.setNumber(0);
				}
			} else {
				switch(this._operator) {
					case 0: {
						result = 0;
						for(let i = 0; i < list.length; i++) {
							result += list[i];
						}
						break;
					}
					case 1:
					case 2: {
						if(this._currentIndex >= 0 && this._currentIndex < list.length) {
							result = list[this._currentIndex];
						}
						break;
					}
				}
				if(this.isText()) {
					this._parent.setText(String(result));
				} else if(this.isNumber()) {
					this._parent.setNumber(result);
				}
			}
		}
	}

	getUpdateComponent() {
		return this;
	}

	update() {
		this.updateCycle();
		this.checkForChange();
		if(this._dynamicList !== null) {
			this._dynamicList.update();
		}
	}

	updateCycle() {
		if(this._duration > 0) {
			this._duration--;
			if(this._duration === 0) {
				this.incrementCycle();
				this.resetDuration();
			}
		}
	}

	incrementCycle() {
		const len = this._dynamicList.currentList.length;
		if(this._operator === 1) {
			this._currentIndex++;
			if(this._currentIndex >= len) {
				this._currentIndex = 0;
			}
		} else if(this._operator === 2) {
			this._currentIndex = Math.floor(Math.random() * len);
		}
	}

	resetIndex() {
		if(this._operator === 1) {
			return 0;
		} else {
			if(this._currentIndex >= this._dynamicList.currentList.length) {
				return 0;
			}
		}
		return 0;
	}

	resetDuration() {
		this._duration = this._frequency;
	}

	destroy() {
		if(this._dynamicList !== null) {
			this._dynamicList.destroy();
			this._dynamicList = null;
		}
	}
}

//=============================================================================
// * UltraHUDComponent_Animation
//=============================================================================
class UltraHUDComponent_Animation {
	getReverseEasing(animationData) {
		switch(animationData.ReturnEasing) {
			case 0: { return animationData.EasingCurve; }
			case 1: { return UltraEasingCurve.invertEasing(animationData.EasingCurve);  }
			case 2: { return animationData.BackwardsEasingCurve; }
		}
		return 0;
	}

	onAnimationConditionChanged(v) {
		if(!this.isComponentValid()) {
			this.stop();
			return;
		}
		if(this._type === 0) {
			if(v) {
				this.start();
			} else {
				this.startReversed();
			}
		} else {
			this._isRunning = v;
		}
	}

	setValue(val) {
		if(!this.isComponentValid()) return;
		$.UltraHUDComponent_Animation.setValue.apply(this, arguments);
		switch(this._property) {
			case 12: { this._component.setHue(val); break; }
		}
	}

	getStart(animationData) {
		switch(animationData.Property) {
			case 12: return animationData.StartHue;
		}
		return $.UltraHUDComponent_Animation.getStart.apply(this, arguments);
	}

	getEnd(animationData) {
		switch(animationData.Property) {
			case 12: return animationData.EndHue;
		}
		return $.UltraHUDComponent_Animation.getEnd.apply(this, arguments);
	}
}

//=============================================================================
// * UltraDynamicList
//=============================================================================
class UltraDynamicList {
	constructor() {
		this.initialize(...arguments);
	}

	initialize(listData, config) {
		this.createPublicFields();
		this.createPrivateFields(listData, config);
	}

	createPublicFields() {
		this.onChange = new UltraSignal();
		this.currentList = null;
	}

	createPrivateFields(listData, config) {
		this._data = listData;
		this._config = config;
		this._type = this._data.Type;
		this._component = null;
		this._updateComponent = null;
	}

	start() {
		this.createComponent();
		this.createUpdateComponent();
	}

	createComponent() {
		switch(this._type) {
			case 0: { this._component = new UltraDynamicList_Numbers(this._data, this); break; }
			case 1: { this._component = new UltraDynamicList_Variables(this._data, this); break; }
			case 2: { this._component = new UltraDynamicList_GroupData(this._data, this); break; }
			case 3: { this._component = new UltraDynamicList_Items(this._data, this); break; }
			case 4: { this._component = new UltraDynamicList_Actor(this._data, this); break; }
			case 5: { this._component = new UltraDynamicList_Enemy(this._data, this); break; }
			case 6: { this._component = new UltraDynamicList_Combine(this._data, this); break; }
			case 7: { this._component = new UltraDynamicList_Code(this._data, this); break; }
		}
	}

	createUpdateComponent() {
		if(this._component != null) {
			this._updateComponent = this._component.getUpdateComponent();
		}
	}

	compareList(val) {
		if(this.currentList === null) {
			return false;
		}
		const len = val.length;
		if(len !== this.currentList.length) {
			return false;
		}
		for(let i = 0; i < len; i++) {
			if(this.currentList[i] !== val[i]) {
				return false;
			}
		}
		return true;
	}

	setList(val) {
		if(!this.compareList(val)) {
			this.currentList = val;
			this.onChange.trigger(this.currentList);
		}
	}

	update() {
		if(this._updateComponent !== null) {
			this._updateComponent.update();
		}
	}

	destroy() {
		if(this._component !== null) {
			this._component.destroy();
		}
	}

	getConfig() {
		return this._config;
	}
}

//=============================================================================
// * UltraDynamicList_Numbers
//=============================================================================
class UltraDynamicList_Numbers extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._start = Math.floor(this._parent.getConfig().processDynamicInput(this._data.Start || 0, true));
		this._end = Math.floor(this._parent.getConfig().processDynamicInput(this._data.End || 1, true));
	}

	verify() {
		return !isNaN(this._start) && !isNaN(this._end);
	}

	start() {
		this.checkForChange();
	}

	checkForChange() {
		const result = [this._start];
		if(this._start < this._end) {
			for(let i = this._start + 1; i <= this._end; i++) {
				result.push(i);
			}
		} else if(this._start > this._end) {
			for(let i = this._start - 1; i >= this._end; i--) {
				result.push(i);
			}
		}
		this._parent.setList(result);
	}
}

//=============================================================================
// * UltraDynamicList_Variables
//=============================================================================
class UltraDynamicList_Variables extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._startId = this._data.Start;
		this._endId = this._data.End;
		this._variableIds = [];
		this._previousValue = [];
		this._destroyId = null;
	}

	verify() {
		return this._startId >= 1 && this._startId < $dataSystem.variables.length && this._endId >= 1 && this._endId < $dataSystem.variables.length;
	}

	start() {
		this.setupVariableIds();
		this.checkForChange();
		this._destroyId = UltraTriggerManager.onVariableChanged.run(this.checkForChange.bind(this));
	}

	setupVariableIds() {
		this._variableIds = [];
		if(this._startId < this._endId) {
			for(let i = this._startId + 1; i <= this._endId; i++) {
				this._variableIds.push(i);
			}
		} else if(this._startId > this._endId) {
			for(let i = this._startId - 1; i >= this._endId; i--) {
				this._variableIds.push(i);
			}
		}
		for(let i = 0; i < this._variableIds.length; i++) {
			this._previousValue.push(null);
		}
	}

	checkForChange() {
		let changed = false;
		for(let i = 0; i < this._variableIds.length; i++) {
			if(this._previousValue[i] !== $gameVariables.value(i)) {
				this._previousValue[i] = $gameVariables.value(i);
				changed = true;
			}
		}
		if(changed) {
			this._parent.setState(this._previousValue);
		}
	}

	destroy() {
		if(this._destroyId !== null) {
			UltraTriggerManager.onVariableChanged.remove(this._destroyId);
		}
	}
}

//=============================================================================
// * UltraDynamicList_GroupData
//=============================================================================
class UltraDynamicList_GroupData extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._membersType = this._data.MembersType;
		this._dataIndex = this._data.Data;
		if("Notetag" in this._data) {
			this._notetagName = this._parent.getConfig().processDynamicInput(this._data.Notetag || "", false);
		} else if("Code" in this._data) {
			this._func = this._parent.getConfig().createCustomFunction(this._data.Code, ["entity"], this);
		}
	}

	verify() {
		const validType = this._membersType >= 0 && this._membersType <= 2;
		const validNote = !("Notetag" in this._data) || (typeof this._notetagName === "string" && this._notetagName.length > 0);
		const validFunc = !("Code" in this._data) || (typeof this._func === "function");
		return validType && validNote && validFunc;
	}

	start() {
		switch(this._membersType) {
			case 0: { this.checkForChange = this.checkForChange_party; break; }
			case 1: { this.checkForChange = this.checkForChange_troop; break; }
			case 2: { this.checkForChange = this.checkForChange_events; break; }
		}
		this.checkForChange();
	}

	verifyMapSpritesetAvailability() {
		return SceneManager._scene.constructor === Scene_Map && SceneManager._scene._spriteset;
	}

	verifyBattleSpritesetAvailability() {
		return SceneManager._scene.constructor === Scene_Battle && BattleManager._spriteset;
	}

	checkForChange_party() {
		let result = null;
		switch(this._dataIndex) {
			case 0: {
				result = [];
				for(let i = 1; i <= $gameParty._actors.length; i++) {
					result.push(i);
				}
				break;
			}
			case 1: {
				result = $gameParty._actors;
				break;
			}
			case 2: {
				result = [];
				for(let i = 0; i < $gameParty._actors.length; i++) {
					result.push($gameActors.actor($gameParty._actors[i]).name());
				}
				break;
			}
			case 3: {
				if(!$gameParty.inBattle() && this.verifyMapSpritesetAvailability()) {
					const spriteset = SceneManager._scene._spriteset;
					result = [];

					const playerSprite = spriteset.playerSprite_ultra();
					if(playerSprite) {
						result.push(playerSprite.visible ? this.getSpritePosition(spriteset.playerSprite_ultra()) : -99999);
					}

					const followers = spriteset.followerSprites_ultra();
					for(let i = 0; i < followers.length; i++) {
						if(followers[i]) {
							result.push(followers[i].visible ? this.getSpritePosition(followers[i]) : -99999);
						}
					}
				} else if(this.verifyBattleSpritesetAvailability()) {
					const sprites = BattleManager._spriteset._actorSprites;
					result = [];
					for(let i = 0; i < sprites.length; i++) {
						if(sprites[i]) {
							result.push(sprites[i].visible ? this.getSpritePosition(sprites[i]) : -99999);
						}
					}
				}
				break;
			}
			case 4: {
				result = [];
				for(let i = 0; i < $gameParty._actors.length; i++) {
					result.push($gameActors.actor($gameParty._actors[i]).actor().meta[this._notetagName]);
				}
				break;
			}
			case 5: {
				result = [];
				for(let i = 0; i < $gameParty._actors.length; i++) {
					result.push(this._func($gameActors.actor($gameParty._actors[i])));
				}
				break;
			}
		}
		if(result !== null) {
			this._parent.setList(result);
		}
	}

	checkForChange_troop() {
		if(!$gameParty.inBattle()) return;
		let result = null;
		switch(this._dataIndex) {
			case 0: {
				result = [];
				for(let i = 1; i <= $gameTroop.members().length; i++) {
					result.push(i);
				}
				break;
			}
			case 1: {
				result = [];
				for(let i = 0; i < $gameTroop.members().length; i++) {
					result.push($gameTroop.members()[i].enemyId());
				}
				break;
			}
			case 2: {
				result = [];
				for(let i = 0; i < $gameTroop.members().length; i++) {
					result.push($gameTroop.members()[i].battlerName());
				}
				break;
			}
			case 3: {
				if(this.verifyBattleSpritesetAvailability()) {
					const sprites = BattleManager._spriteset._enemySprites;
					result = [];
					for(let i = 0; i < sprites.length; i++) {
						if(sprites[i]) {
							result.push(sprites[i].visible ? this.getSpritePosition(sprites[i]) : -99999);
						}
					}
				}
				break;
			}
			case 4: {
				result = [];
				for(let i = 0; i < $gameTroop.members().length; i++) {
					result.push($gameTroop.members()[i].enemy().meta[this._notetagName]);
				}
				break;
			}
			case 5: {
				result = [];
				for(let i = 0; i < $gameTroop.members().length; i++) {
					result.push(this._func($gameTroop.members()[i]));
				}
				break;
			}
		}
		if(result !== null) {
			this._parent.setList(result);
		}
	}

	checkForChange_events() {
		if($gameParty.inBattle()) return;
		let result = null;
		switch(this._dataIndex) {
			case 0:
			case 1: {
				result = [];
				for(let i = 1; i <= $gameMap._events.length; i++) {
					if($gameMap._events[i - 1]) {
						result.push(this._dataIndex === 0 ? i : i - 1);
					}
				}
				break;
			}
			case 2: {
				result = [];
				for(let i = 0; i < $gameMap._events.length; i++) {
					if($gameMap._events[i]) {
						result.push($gameMap._events[i].event().name);
					}
				}
				break;
			}
			case 3: {
				if(this.verifyMapSpritesetAvailability()) {
					result = [];
					const spriteset = SceneManager._scene._spriteset;
					const events = spriteset.eventSprites_ultra();
					for(let i = 0; i < events.length; i++) {
						if(events[i]) {
							result.push(events[i].visible ? this.getSpritePosition(events[i]) : -99999);
						}
					}
				}
				break;
			}
			case 4: {
				result = [];
				for(let i = 0; i < $gameMap._events.length; i++) {
					if($gameMap._events[i]) {
						result.push($gameMap._events[i].event().meta[this._notetagName]);
					}
				}
				break;
			}
			case 5: {
				result = [];
				for(let i = 0; i < $gameMap._events.length; i++) {
					if($gameMap._events[i]) {
						result.push(this._func($gameMap._events[i]));
					}
				}
				break;
			}
		}
		if(result !== null) {
			this._parent.setList(result);
		}
	}

	getSpritePosition(sprite) {
		if(sprite !== null) {
			const pos = new Point();
			sprite.getGlobalPosition(pos);
			let result = null;
			switch(this._data.Position) {
				case 0: { result = pos.y - (sprite.height * sprite.anchor.y); break; }
				case 1: { result = pos.y + (sprite.anchor.y < 0.5 ? (0.5 - sprite.anchor.y) * sprite.height : (sprite.anchor.y - 0.5) * -sprite.height); break; }
				case 2: { result = pos.y + (sprite.height * (1 - sprite.anchor.y)); break; }
				case 3: { result = pos.x - (sprite.width * sprite.anchor.x); break; }
				case 4: { result = pos.x + (sprite.anchor.x < 0.5 ? (0.5 - sprite.anchor.x) * sprite.width : (sprite.anchor.x - 0.5) * -sprite.width); break; }
				case 5: { result = pos.x + (sprite.width * (1 - sprite.anchor.x)); break; }
			}
			if(result !== null) {
				return Math.round(result);
			}
		}
		return 0;
	}

	getUpdateComponent() {
		return this;
	}

	update() {
		this.checkForChange();
	}
}

//=============================================================================
// * UltraDynamicList_Items
//=============================================================================
class UltraDynamicList_Items extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._itemType = this._data.ItemType;
		this._dataIndex = this._data.Data;
		if("Notetag" in this._data) {
			this._notetagName = this._parent.getConfig().processDynamicInput(this._data.Notetag || "", false);
		}
	}

	verify() {
		const validType = this._itemType >= 0 && this._itemType <= 4;
		const validNote = !("Notetag" in this._data) || (typeof this._notetagName === "string" && this._notetagName.length > 0);
		return validType && validNote;
	}

	start() {
		this.checkForChange();
		this._destroyId = UltraTriggerManager.onItemCountChanged.run(this.checkForChange.bind(this));
	}

	checkForChange() {
		let result = null;
		if(this._dataIndex === 0) {
			switch(this._itemType) {
				case 1: { result = Object.keys($gameParty._items); break; }
				case 2: { result = Object.keys($gameParty._weapons); break; }
				case 3: { result = Object.keys($gameParty._armors); break; }
				case 4: { result = Object.keys($gameParty._items).filter(id => $dataItems[id].itypeId === 2); break; }
			}
		} else if(this._dataIndex === 2) {
			switch(this._itemType) {
				case 1: { result = Object.values($gameParty._items); break; }
				case 2: { result = Object.values($gameParty._weapons); break; }
				case 3: { result = Object.values($gameParty._armors); break; }
				case 4: { result = Object.keys($gameParty._items).filter(id => $dataItems[id].itypeId === 2).map(key => $gameParty._items[key]); break; }
			}
		} else {
			let itemList = null;
			switch(this._itemType) {
				case 0: { itemList = $gameParty.allItems(); break; }
				case 1: { itemList = $gameParty.items(); break; }
				case 2: { itemList = $gameParty.weapons(); break; }
				case 3: { itemList = $gameParty.armors(); break; }
				case 4: { itemList = $gameParty.items().filter(item => item.itypeId === 2); break; }
			}
			if(itemList !== null) {
				switch(this._dataIndex) {
					case 1: {
						result = itemList.map(item => item.name);
						break;
					}
					case 3: {
						result = itemList.map(item => item.iconIndex);
						break;
					}
					case 4: {
						result = itemList.map(item => item.price || 0);
						break;
					}
					case 5: {
						result = itemList.map(item => item.meta[this._notetagName]);
						break;
					}
				}
			}
		}
		if(result !== null) {
			this._parent.setList(result);
		}
	}

	getUpdateComponent() {
		return this;
	}

	update() {
		this.checkForChange();
	}

	destroy() {
		if(this._destroyId !== null) {
			UltraTriggerManager.onItemCountChanged.remove(this._destroyId);
			this._destroyId = null;
		}
	}
}

//=============================================================================
// * UltraDynamicList_ActorOrEnemy
//=============================================================================
class UltraDynamicList_ActorOrEnemy extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._index = this._parent.getConfig().processDynamicInput(this._data.Index || 1, true) - 1;
		this._dataIndex = this._data.Data;
		if("Notetag" in this._data) {
			this._notetagName = this._parent.getConfig().processDynamicInput(this._data.Notetag || "", false);
		}
	}

	verify() {
		const validData = this._dataIndex >= 0 && this._dataIndex <= 12;
		const validNote = !("Notetag" in this._data) || (typeof this._notetagName === "string" && this._notetagName.length > 0);
		return validData && validNote;
	}

	start() {
		if(this.isNotetag()) {
			this.checkForChange_notetag();
		} else {
			this.checkForChange();
		}
	}

	isNotetag() {
		return this._dataIndex === 15;
	}

	checkForChange() {
		let result = null;
		const battler = this.getBattlerObject();
		if(battler) {
			switch(this._dataIndex) {
				case 0:
				case 1:
				case 2: {
					const skills = this.getSkills(battler);
					if(skills !== null) {
						result = this.extractDataProperties(skills, $dataSkills, this._dataIndex);
					}
					break;
				}
				case 3:
				case 4:
				case 5: {
					const equips = this.getEquips(battler);
					if(equips !== null) {
						result = this.extractDataProperties(equips, $dataArmors, this._dataIndex - 3);
					}
					break;
				}
				case 6:
				case 7:
				case 8: {
					const states = this.getStates(battler);
					if(states !== null) {
						result = this.extractDataProperties(battler._states, $dataStates, this._dataIndex - 6);
					}
					break;
				}
				case 9:
				case 10:
				case 11: {
					const buffs = this.getBuffs(battler, this._dataIndex - 9);
					if(buffs !== null) {
						result = buffs;
					}
					break;
				}
				case 12: { result = this.getParams(battler); break; }
				case 13: { result = this.getXParams(battler); break; }
				case 14: { result = this.getSParams(battler); break; }
				case 16: { result = this.getStateTurns(battler); break; }
			}
		}
		if(result !== null) {
			this._parent.setList(result);
		}
	}

	getBattlerObject() {
		return null;
	}

	getSkills(battler) {
		return null;
	}

	getEquips(battler) {
		return null;
	}

	getStates(battler) {
		return null;
	}

	getStateTurns(battler) {
		return battler._states.map(id => battler._stateTurns[id] || 0).filter(count => count > 0);
	}

	getBuffs(battler, type) {
		switch(type) {
			case 0: return battler.buffIds_Ultra();
			case 1: return battler.buffNames_Ultra();
			case 2: return battler.buffIcons();
		}
		return null;
	}

	getParams(battler) {
		const result = [];
		for(let i = 0; i <= 7; i++) {
			result.push(battler.param(i));
		}
		return result;
	}

	getXParams(battler) {
		const result = [];
		for(let i = 0; i <= 9; i++) {
			result.push(battler.xparam(i));
		}
		return result;
	}

	getSParams(battler) {
		const result = [];
		for(let i = 0; i <= 9; i++) {
			result.push(battler.sparam(i));
		}
		return result;
	}

	extractDataProperties(idArr, dataObj, type, battler) {
		switch(type) {
			case 0: { return idArr; }
			case 1: { return idArr.map(id => dataObj[id].name); }
			case 2: { return idArr.map(id => dataObj[id].iconIndex); }
		}
		return null;
	}

	checkForChange_notetag() {
		const actor = this._index >= 0 && this._index < $gameParty.members().length ? $gameParty.members()[this._index] : null;
		const note = actor.actor().meta[this._notetagName];
		if(note && typeof note === "string") {
			const jsonString = "[" + note.trim() + "]";
			let jsonValid = true;
			let jsonObj = null;
			try {
				jsonObj = JSON.parse(jsonString);
			} catch(e) {
				jsonValid = false;
			}
			if(jsonValid && Array.isArray(jsonObj)) {
				this._parent.setList(jsonObj);
			}
		}
	}

	getUpdateComponent() {
		return this._dataIndex === 12 ? null : this;
	}

	update() {
		this.checkForChange();
	}
}

//=============================================================================
// * UltraDynamicList_Actor
//=============================================================================
class UltraDynamicList_Actor extends UltraDynamicList_ActorOrEnemy {
	checkForChange() {
		if(this.isEquipAndWeapons()) {
			this.checkForChange_equips();
		} else {
			super.checkForChange();
		}
	}

	isEquipAndWeapons() {
		return this._dataIndex >= 3 && this._dataIndex <= 5;
	}

	checkForChange_equips() {
		let result = null;
		const actor = this.getBattlerObject();
		switch(this._dataIndex) {
			case 3: { result = actor._equips.map(equip => equip.itemId()); break; }
			case 4: { result = actor._equips.map(equip => equip.object().name); break; }
			case 5: { result = actor._equips.map(equip => equip.object().iconIndex); break; }
		}
		if(result !== null) {
			this._parent.setList(result);
		}
	}

	getBattlerObject() {
		return this._index >= 0 && this._index < $gameParty.members().length ? $gameParty.members()[this._index] : null;
	}

	getSkills(actor) {
		return actor._skills;
	}

	getStates(actor) {
		return actor._states;
	}
}

//=============================================================================
// * UltraDynamicList_Enemy
//=============================================================================
class UltraDynamicList_Enemy extends UltraDynamicList_ActorOrEnemy {
	getBattlerObject() {
		return this._index >= 0 && this._index < $gameTroop.members().length ? $gameTroop.members()[this._index] : null;
	}

	getEnemySkills(enemy) {
		return enemy.enemy().actions.map(a => a.skillId).filter((v,i, a) => a.indexOf(v) === i);
	}

	getEnemyStates(enemy) {
		return enemy._states;
	}
}

//=============================================================================
// * UltraDynamicList_Combine
//=============================================================================
class UltraDynamicList_Combine extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._list1Data = this._data.List1;
		this._list2Data = this._data.List2;
		this._destroyId1 = null;
		this._destroyId2 = null;
		this._list1 = null;
		this._list2 = null;
	}

	start() {
		this._list1 = new UltraDynamicList(this._list1Data, this._parent.getConfig());
		this._list2 = new UltraDynamicList(this._list2Data, this._parent.getConfig());
		this.checkForChange();
		this._destroyId1 = this._list1.onChange.run(this.checkForChange.bind(this));
		this._destroyId2 = this._list2.onChange.run(this.checkForChange.bind(this));
	}

	checkForChange() {
		if(this._list1 !== null && this._list2 !== null) {
			this._parent.setState(this._list1.currentList.concat(this._list2.currentList));
		}
	}

	destroy() {
		if(this._destroyId1 !== null && this._list1 !== null) {
			this._list1.onChange.remove(this._destroyId1);
			this._destroyId1 = null;
		}
		if(this._destroyId2 !== null && this._list2 !== null) {
			this._list2.onChange.remove(this._destroyId2);
			this._destroyId2 = null;
		}
	}
}

//=============================================================================
// * UltraDynamicList_Code
//=============================================================================
class UltraDynamicList_Code extends UltraDynamicValue_BaseComponent {
	createFields() {
		this._func = this._parent.getConfig().createCustomFunction(this._data.Code, null, this);
	}

	verify() {
		return this._func !== null;
	}

	start() {
		this.checkForChange();
	}

	checkForChange() {
		if(this._func !== null) {
			const val = this._func();
			if(val && Array.isArray(val)) {
				this._parent.setList(val);
			}
		}
	}

	getUpdateComponent() {
		return this;
	}

	update() {
		this.checkForChange();
	}
}

//=============================================================================
// * UltraHUDAddon_Base
//=============================================================================
class UltraHUDAddon_Base {
	constructor() {
		this.initialize(...arguments);
	}

	initialize(data, comp) {
		this._data = data;
		this._component = comp;
	}

	start() {
	}

	update() {
	}

	destroy() {
	}

	onChildAdded(child) {
	}

	isComponentEnabled() {
		return this._component.isEnabled() && $gameUltraHUD.isHUDEnabled();
	}
}

//=============================================================================
// * UltraHUDAddon_ColorFilter
//=============================================================================
class UltraHUDAddon_ColorFilter extends UltraHUDAddon_Base {
	start() {
		const type = this._data.FilterType;
		switch(type) {
			case 0: {
				this._component.setHue(this._data.Hue);
				break;
			}
			case 1: {
				this._component.setColorTone(UltraUtils.hexTo255Array(this._data.Tone, this._data.Grey / 100));
				break;
			}
			case 2: {
				this._component.setBlendColor(UltraUtils.hexTo255Array(this._data.Blend, this._data.Opacity / 100));
				break;
			}
			case 3: {
				this._component.setBrightness((this._data.Brightness / 100) * 255);
				break;
			}
		}
	}
}

//=============================================================================
// * UltraHUDAddon_Hover
//=============================================================================
class UltraHUDAddon_Hover extends UltraHUDAddon_Base {
	start() {
		this._isHovered = false;
		this._hoverFunc = null;
		this._animation = null;
		if(this._data.HoverType === 3) {
			this._hoverFunc = this._component._hud.getConfig().createCustomFunction(this._data.Code, ["isHovered"], this);
		} else if(this._data.HoverType === 99) {
			this._animation = this._data.Animation;
		}
	}

	update() {
		if(!this.isComponentEnabled()) return;
		const isHover = this._component.isHovered();
		if(this._isHovered !== isHover) {
			this._isHovered = isHover;
			this.runHoverAction();
		}
	}

	runHoverAction() {
		switch(this._data.HoverType) {
			case 0: {
				if(this._isHovered) {
					$gameTemp.reserveCommonEvent(this._data.ID);
				}
				break;
			}
			case 1: {
				if(!this._isHovered) {
					$gameTemp.reserveCommonEvent(this._data.ID);
				}
				break;
			}
			case 2: {
				$gameSwitches.setValue(this._data.ID, this._isHovered);
				break;
			}
			case 3: {
				if(this._hoverFunc !== null) {
					this._hoverFunc(this._isHovered);
				}
				break;
			}
			case 99: {
				if(this._animation !== null) {
					if(this._isHovered) {
						this._animation.start();
					} else {
						this._animation.startReversed();
					}
				}
				break;
			}
		}
	}

	destroy() {
		super.destroy();
		if(this._isHovered) {
			this._isHovered = false;
			this.runHoverAction();
		}
	}
}

//=============================================================================
// * UltraHUDAddon_Click
//=============================================================================
class UltraHUDAddon_Click extends UltraHUDAddon_Base {
	start() {
		this._isClicked = false;
		this._clickFunc = null;
		this._animation = null;
		if(this._data.ClickType === 1) {
			this._clickFunc = this._component._hud.getConfig().createCustomFunction(this._data.Code, null, this);
		} else if(this._data.ClickType === 99) {
			this._animation = this._data.Animation;
		}
	}

	update() {
		if(!this.isComponentEnabled()) return;
		const isHovered = this._component.isHovered();
		if(!this._isClicked) {
			if(isHovered && TouchInput.isTriggered()) {
				this.setClickState(true);
				$gameUltraHUD.setHUDButtonClicked();
			}
		} else {
			if(!isHovered) {
				this.setClickState(false);
			} else if(TouchInput.isReleased()) {
				this.setClickState(false);
				this.runClickAction();
			} else {
				$gameUltraHUD.setHUDButtonClicked();
			}
		}
	}

	setClickState(val) {
		if(this._isClicked !== val) {
			this._isClicked = val;
			this.runSpecialClickAction(this._isClicked);
		}
	}

	runClickAction() {
		switch(this._data.ClickType) {
			case 0: {
				$gameTemp.reserveCommonEvent(this._data.ID);
				break;
			}
			case 1: {
				if(this._clickFunc !== null) {
					this._clickFunc();
				}
				break;
			}
		}
	}

	runSpecialClickAction(isClicked) {
		switch(this._data.ClickType) {
			case 99: {
				if(this._animation !== null) {
					if(isClicked) {
						this._animation.start();
					} else {
						this._animation.startReversed();
					}
				}
				break;
			}
		}
	}
}

//=============================================================================
// * UltraHUDAddon_CodeProperty
//=============================================================================
class UltraHUDAddon_CodeProperty extends UltraHUDAddon_Base {
	start() {
		this._property = this._data.Property;
		this._func = this._component._hud.getConfig().createCustomFunction(this._data.Code, null, this);
	}

	update() {
		if(this._func !== null) {
			this.setValue(this._func());
		}
	}

	setValue(val) {
		switch(this._property) {
			case 0: { this._component.x = val; break; }
			case 1: { this._component.y = val; break; }
			case 2: { this._component.scale.x = val; break; }
			case 3: { this._component.scale.y = val; break; }
			case 4: { this._component.setComponentWidth(val); break; }
			case 5: { this._component.setComponentHeight(val); break; }
			case 6: { this._component.rotation = val; break; }
			case 7: { this._component.alpha = val; break; }
			case 8: { this._component.openness = val * 255; break; }
			case 9: { this._component.setRepeatOffsetX(val); break; }
			case 10: { this._component.setRepeatOffsetY(val); break; }
		}
	}
}

//=============================================================================
// * UltraHUDAddon_CodeBehavior
//=============================================================================
class UltraHUDAddon_CodeBehavior extends UltraHUDAddon_Base {
	start() {
		this._behavior = this._data.Behavior;
		this._func = this._component._hud.getConfig().createCustomFunction(this._data.Code, this.getParameters(), this);
		switch(this._behavior) {
			case 0: { this.callFunction(); break }
			case 1: { this.onChildAdded = this.callFunction1; break; }
			case 2: { this.update = this.callFunction; break; }
			case 3: { this.destroy = this.callFunction; break; }
		}
	}

	getParameters() {
		return this._behavior === 1 ? ["component", "child"] : ["component"];
	}

	callFunction() {
		if(this._func !== null) {
			this._func(this._component);
		}
	}

	callFunction1(arg1) {
		if(this._func !== null) {
			this._func(this._component, arg1);
		}
	}
}

//=============================================================================
// * Sprite_UltraHUDComponent_CustomComponent
//=============================================================================
class Sprite_UltraHUDComponent_CustomComponent extends Sprite_UltraHUDComponent {
	initialize(data, hud, listValue, createdAtStart) {
		this._createdAtStart = !!createdAtStart;
		super.initialize(data, hud);
		this.setupListValue(listValue);
		this.setupCustomComponent();
	}

	createPrivateFields(data, hud) {
		super.createPrivateFields(data, hud);
		this._customContent = null;
		this._customWidth = 0;
		this._customHeight = 0;
	}

	boundingRect() {
		return new Rectangle(this._customWidth / -2, this._customHeight / -2, this._customWidth, this._customHeight);
	}

	setupListValue(listValue) {
		if(listValue !== undefined && listValue !== null) {
			this._listValue = listValue;
		} else {
			this._listValue = null;
		}
	}

	setupCustomComponent() {
		const customID = this._data.CustomData.ID;
		this.createHUD(this.findHUDData(customID), customID);
	}

	syncDisplayAnimationState() {
		if(!this._createdAtStart) return;
		super.syncDisplayAnimationState();
	}

	createHUD(hudData, customID) {
		const config = this._hud.getConfig();
		if(hudData !== null && !config.isCustomComponentParent(customID)) {
			const shouldPop = config.pushAllCustomComponentData(this._data.CustomData.ID, this.convertCustomData(this._data.CustomData.Params, hudData));
			this._customContent = new Sprite_UltraHUD(hudData, config);
			if(shouldPop) config.popAllCustomComponentData();
			this._customWidth = hudData.Width;
			this._customHeight = hudData.Height;
			this._customContent.x = this._customWidth / -2;
			this._customContent.y = this._customHeight / -2;
			this.addChild(this._customContent);
		}
	}

	convertCustomData(customData, customCompData) {
		if(customCompData && customCompData.Params && customCompData.Params.length > 0) {
			let result = JsonEx.makeDeepCopy(customData);
			const len = customCompData.Params.length;
			for(let i = 0; i < len; i++) {
				const paramData = customCompData.Params[i];
				const paramName = paramData.Name;
				if(paramName in result) {
					if(result[paramName] === true) {
						result[paramName] = this._listValue !== null ? this._listValue : (paramData.IsString ? "" : 0);
					} else {
						result[paramName] = this._hud.getConfig().processDynamicInput(result[paramName], !paramData.IsString);
					}
				}
			}
			return result;
		}
		return {};
	}

	update() {
		super.update();
		if(this._customContent !== null) {
			this._customContent.update();
		}
	}

	onAnimationCreated(animation, animationData) {
		super.onAnimationCreated(animation, animationData);
		const activateType = animationData.ActivateType;
		if(activateType.Type === 0 && activateType.RunType === 2) {
			if(!this._createdAtStart) {
				animation.start();
			}
		}
	}
}

//=============================================================================
// * Sprite_UltraHUDComponent_CustomComponentCollection
//=============================================================================
class Sprite_UltraHUDComponent_CustomComponentCollection extends Sprite_UltraHUDComponent {
	initialize(data, hud) {
		super.initialize(data, hud);
		this.setupCustomComponentCollection();
		if(this._isValid) {
			this.setupDynamicList();
		} else {
			this.update = function() {}
		}
	}

	createPrivateFields(data, hud) {
		super.createPrivateFields(data, hud);
		this._starting = true;
		this._dynamicList = null;
		this._collection = [];
		this._destroyCollection = [];
		this._currentList = [];
	}

	setupCustomComponentCollection() {
		const collectionData = this._data.CustomCollectionData;
		this._rows = this._hud.getConfig().processDynamicInput(collectionData.MaxRows || 1, true);
		this._cols = this._hud.getConfig().processDynamicInput(collectionData.MaxColumns || 1, true);
		this._maxIndex = this._rows * this._cols;

		const spaceX = this._hud.getConfig().processDynamicInput(collectionData.HorizontalSpacing === undefined ? 0 : collectionData.HorizontalSpacing, true);
		const spaceY = this._hud.getConfig().processDynamicInput(collectionData.VerticalSpacing === undefined ? 0 : collectionData.VerticalSpacing, true);

		this._customData = JsonEx.makeDeepCopy(this._data);
		this._customData.CustomData = this._customData.CustomCollectionData;
		this._customData.CustomCollectionData = null;

		const hudData = this.findHUDData(collectionData.ID);
		if(hudData !== null) {
			const fullWidth = (this._cols * hudData.Width) + ((this._cols - 1) + spaceX);
			const fullHeight = (this._rows * hudData.Height) + ((this._rows - 1) + spaceY);
			this._offsetX = (fullWidth / -2.0) + (hudData.Width / 2.0);
			this._offsetY = (fullHeight / -2.0) + (hudData.Height / 2.0);
			this._compWidth = (hudData.Width + spaceX);
			this._compHeight = (hudData.Height + spaceY);
			this._isValid = true;
		} else {
			this._isValid = false;
		}
	}

	setupDynamicList() {
		const listData = this._data.CustomCollectionData.ListData;
		if(listData) {
			this._dynamicList = new UltraDynamicList(listData, this._hud.getConfig());
			this._dynamicList.onChange.run(this.onDynamicListChanged.bind(this));
			this._dynamicList.start();
			this._starting = false;
		}
	}

	onDynamicListChanged(list) {
		for(let i = 0; i < this._maxIndex; i++) {
			const oldVal = this.collectionItemExists(i) ? this._currentList[i] : null;
			const newVal = i >= 0 && i < list.length ? list[i] : null;
			if(oldVal !== newVal) {
				if(oldVal !== null) {
					this.removeItemInCollection(i);
				}
				if(newVal !== null) {
					this.createItemInCollection(i, newVal);
				}
			}
		}
		this._currentList = list;
	}

	collectionItemExists(index) {
		return index >= 0 && index < this._collection.length;
	}

	removeItemInCollection(index) {
		if(index >= 0 && index < this._collection.length) {
			const comp = this._collection[index];
			if(comp !== null) {
				this._collection[index] = null;
				comp.setForcedVisibility(false);
				this.insertItemIntoDestroyCollection(comp);
			}
		}
	}

	insertItemIntoDestroyCollection(comp) {
		let foundSpot = false;
		for(let i = 0; i < this._destroyCollection.length; i++) {
			if(this._destroyCollection[i] === null) {
				this._destroyCollection[i] = comp;
				foundSpot = true;
				break;
			}
		}
		if(!foundSpot) {
			this._destroyCollection.push(comp);
		}
	}

	createItemInCollection(index, data) {
		while(this._collection.length <= index) {
			this._collection.push(null);
		}
		if(this._collection[index] === null) {
			const comp = new Sprite_UltraHUDComponent_CustomComponent(this._customData, this._hud, data, this._starting);
			const x = index % this._cols;
			const y = Math.floor(index / this._cols);
			comp.x = Math.round(this._offsetX + (x * this._compWidth));
			comp.y = Math.round(this._offsetY + (y * this._compHeight));
			this.addChild(comp);
			this._collection[index] = comp;
		}
	}

	update() {
		super.update();
		this.updateDynamicList();
		this.updateCollection();
		this.updateDestroyCollection();
	}

	updateDynamicList() {
		if(this._dynamicList !== null) {
			this._dynamicList.update();
		}
	}

	updateCollection() {
		if(this._collection !== null) {
			const len = this._collection.length;
			for(let i = 0; i < len; i++) {
				const comp = this._collection[i];
				if(comp !== null) {
					comp.update();
				}
			}
		}
	}

	updateDestroyCollection() {
		if(this._destroyCollection !== null) {
			const len = this._destroyCollection.length;
			for(let i = 0; i < len; i++) {
				const comp = this._destroyCollection[i];
				if(comp !== null) {
					comp.update();
					if(!comp.visible) {
						this.destroyItemInCollection(i);
					}
				}
			}
		}
	}

	destroyItemInCollection(index) {
		if(index >= 0 && index < this._destroyCollection.length) {
			const comp = this._destroyCollection[index];
			if(comp !== null) {
				this._destroyCollection[index] = null;
				this.removeChild(comp);
				comp.destroy();
			}
		}
	}

	setupDisplayConditions() {
		this._multiCondition = null;
	}

	setupAnimations() {
		this._animations = null;
	}

	destroy() {
		super.destroy();
		if(this._dynamicList !== null) {
			this._dynamicList.destroy();
		}
	}
}

//=============================================================================
// * Sprite_UltraHUDComponent_AttachComponentCollection
//=============================================================================
class Sprite_UltraHUDComponent_AttachComponentCollection extends Sprite_UltraHUDComponent {
	initialize(data, hud) {
		super.initialize(data, hud);
		this.x = this.y = 0;
		this.setupAttachComponentCollection();
		if(this._isValid) {
			this.setupDynamicList();
			this.setupDynamicPositionOffsets();
			this.setupDynamicPositions();
			this._starting = false;
		} else {
			this.update = function() {}
		}
	}

	createPrivateFields(data, hud) {
		super.createPrivateFields(data, hud);
		this._starting = true;
		this._dynamicList = null;
		this._dynamicXList = null;
		this._dynamicYList = null;
		this._xOffset = 0;
		this._yOffset = 0;
		this._collection = [];
		this._destroyCollection = [];
		this._currentList = [];
	}

	setupAttachComponentCollection() {
		const collectionData = this._data.AttachCollectionData;
		this._customData = JsonEx.makeDeepCopy(this._data);
		this._customData.CustomData = this._customData.AttachCollectionData;
		this._customData.AttachCollectionData = null;

		const hudData = this.findHUDData(collectionData.ID);
		this._isValid = hudData !== null;
	}

	setupDynamicList() {
		const attachCollectData = this._data.AttachCollectionData;
		if("Data" in attachCollectData) {
			const attachType = attachCollectData.List;
			const attachData = attachCollectData.Data;

			// Convert "Attachment List" input to "MembersType" of UltraDynamicList_GroupData
			const membersType = attachType === 0 || attachType === 2 ? 0 : (attachType === 3 ? 1 : (attachType === 1 ? 2 : -1));

			// Convert "Attachment Data" input to "Data" of UltraDynamicList_GroupData
			const membersData = attachData <= 2 ? attachData : (attachData === 3 ? 4 : 5);

			const listData = {};
			if(membersType === -1) {
				// If -1, we need to use a combine list for all battlers.
				listData.Type = 6;
				listData.List1 = { Type: 2, MembersType: 0, Data: membersData };
				listData.List2 = { Type: 2, MembersType: 1, Data: membersData };
				this._setupSpecialDataMembers(listData.List1, attachCollectData, membersData);
				this._setupSpecialDataMembers(listData.List2, attachCollectData, membersData);
			} else {
				// Otherwise, simulate standard member data retrieval.
				listData.Type = 2;
				listData.MembersType = membersType;
				listData.Data = membersData;
				this._setupSpecialDataMembers(listData, attachCollectData, membersData);
			}

			this._dynamicList = new UltraDynamicList(listData, this._hud.getConfig());
			this._dynamicList.onChange.run(this.onDynamicListChanged.bind(this));
			this._dynamicList.start();
		}
	}

	_setupSpecialDataMembers(listData, attachData, membersData) {
		if(membersData === 4) {
			listData.Notetag = attachData.Notetag;
		} else if(membersData === 5) {
			listData.Code = attachData.Code;
		}
	}

	onDynamicListChanged(list) {
		const end = Math.max(list.length, this._currentList.length);
		for(let i = 0; i < end; i++) {
			const oldVal = this.collectionItemExists(i) ? this._currentList[i] : null;
			const newVal = i >= 0 && i < list.length ? list[i] : null;
			if(oldVal !== newVal) {
				if(oldVal !== null) {
					this.removeItemInCollection(i);
				}
				if(newVal !== null) {
					this.createItemInCollection(i, newVal);
				}
			}
		}
		this._currentList = list;
	}

	collectionItemExists(index) {
		return index >= 0 && index < this._collection.length;
	}

	removeItemInCollection(index) {
		if(index >= 0 && index < this._collection.length) {
			const comp = this._collection[index];
			if(comp !== null) {
				this._collection[index] = null;
				comp.setForcedVisibility(false);
				this.insertItemIntoDestroyCollection(comp);
			}
		}
	}

	insertItemIntoDestroyCollection(comp) {
		let foundSpot = false;
		for(let i = 0; i < this._destroyCollection.length; i++) {
			if(this._destroyCollection[i] === null) {
				this._destroyCollection[i] = comp;
				foundSpot = true;
				break;
			}
		}
		if(!foundSpot) {
			this._destroyCollection.push(comp);
		}
	}

	createItemInCollection(index, data) {
		while(this._collection.length <= index) {
			this._collection.push(null);
		}
		if(this._collection[index] === null) {
			const comp = new Sprite_UltraHUDComponent_CustomComponent(this._customData, this._hud, data, this._starting);
			this.addChild(comp);
			this._collection[index] = comp;
		}
	}

	setupDynamicPositionOffsets() {
		this._xOffset = 0;
		this._yOffset = 0;
		let current = this;
		const scene = SceneManager._scene;
		do {
			this._xOffset -= current.x;
			this._yOffset -= current.y;
			current = current.parent;
		} while(current && current.parent !== scene);
	}

	setupDynamicPositions() {
		this._dynamicXList = this.setupDynamicPosition(true, this.onDynamicXPositionChanged.bind(this));
		this._dynamicYList = this.setupDynamicPosition(false, this.onDynamicYPositionChanged.bind(this));
	}

	setupDynamicPosition(isXPosType, callback) {
		const attachCollectData = this._data.AttachCollectionData;
		const attachType = attachCollectData.List;
		const membersType = attachType === 0 || attachType === 2 ? 0 : (attachType === 3 ? 1 : (attachType === 1 ? 2 : -1));
		const pos = attachCollectData.Position;
		const positionType = isXPosType ? ((pos % 3) + 3) : (Math.floor(pos / 3));

		const listData = {};
		if(membersType === -1) {
			listData.Type = 6;
			listData.List1 = { Type: 2, MembersType: 0, Data: 3, Position: positionType };
			listData.List2 = { Type: 2, MembersType: 1, Data: 3, Position: positionType };
		} else {
			listData.Type = 2;
			listData.MembersType = membersType;
			listData.Data = 3;
			listData.Position = positionType;
		}

		const dynamicList = new UltraDynamicList(listData, this._hud.getConfig());
		dynamicList.onChange.run(callback);
		dynamicList.start();
		return dynamicList;
	}

	onDynamicXPositionChanged(xPositions) {
		for(let i = 0; i < xPositions.length; i++) {
			const comp = i >= 0 && i < this._collection.length ? this._collection[i] : null;
			if(comp !== null) {
				comp.x = xPositions[i] + this._xOffset;
			}
		}
	}

	onDynamicYPositionChanged(yPositions) {
		for(let i = 0; i < yPositions.length; i++) {
			const comp = i >= 0 && i < this._collection.length ? this._collection[i] : null;
			if(comp !== null) {
				comp.y = yPositions[i] + this._yOffset;
			}
		}
	}

	update() {
		super.update();
		this.updateDynamicList();
		this.updateCollection();
		this.updateDestroyCollection();
	}

	updateDynamicList() {
		if(this._dynamicList !== null) {
			this._dynamicList.update();
		}
		if(this._dynamicXList !== null) {
			this._dynamicXList.update();
		}
		if(this._dynamicYList !== null) {
			this._dynamicYList.update();
		}
	}

	updateCollection() {
		if(this._collection !== null) {
			const len = this._collection.length;
			for(let i = 0; i < len; i++) {
				const comp = this._collection[i];
				if(comp !== null) {
					comp.update();
				}
			}
		}
	}

	updateDestroyCollection() {
		if(this._destroyCollection !== null) {
			const len = this._destroyCollection.length;
			for(let i = 0; i < len; i++) {
				const comp = this._destroyCollection[i];
				if(comp !== null) {
					comp.update();
					if(!comp.visible) {
						this.destroyItemInCollection(i);
					}
				}
			}
		}
	}

	destroyItemInCollection(index) {
		if(index >= 0 && index < this._destroyCollection.length) {
			const comp = this._destroyCollection[index];
			if(comp !== null) {
				this._destroyCollection[index] = null;
				this.removeChild(comp);
				comp.destroy();
			}
		}
	}

	setupDisplayConditions() {
		this._multiCondition = null;
	}

	setupAnimations() {
		this._animations = null;
	}

	destroy() {
		super.destroy();
		if(this._dynamicList !== null) {
			this._dynamicList.destroy();
		}
		if(this._dynamicXList !== null) {
			this._dynamicXList.destroy();
		}
		if(this._dynamicYList !== null) {
			this._dynamicYList.destroy();
		}
	}
}

//=============================================================================
// * Sprite_UltraHUDComponent_Animation
//=============================================================================
class Sprite_UltraHUDComponent_Animation extends Sprite_UltraHUDComponent {
	initialize(data, hud) {
		super.initialize(data, hud);
		this._animationSprite = null;
		this._dataAnimation = null;
		this._placeholder = null;
		this.setupAnimation();
	}

	setupAnimation() {
		const animationData = this._data.AnimationData;
		const id = animationData.AnimationID;
		if(id >= 1 && id < $dataAnimations.length) {
			this.createAnimation(id, this.createPlaceholder());
		}
		this._behavior = animationData.Behavior;
	}

	createPlaceholder() {
		this._placeholder = new Sprite();
		this.addChild(this._placeholder);
		return this._placeholder;
	}

	createAnimation(id, placeholder) {
		const animation = $dataAnimations[id];
		this.createAnimationInternal(animation, placeholder);
	}

	createAnimationInternal(animation, placeholder) {
		const mv = this.isMVAnimation(animation);
		const sprite = new (mv ? Sprite_AnimationMV : Sprite_Animation)();
		sprite.setup([placeholder], animation, false, 0, null);
		this._animationSprite = sprite;
		this._dataAnimation = animation;
		this.addChild(sprite);
	}

	isMVAnimation(data) {
		return "frames" in data;
	}

	update() {
		super.update();
		this.updateAnimation();
	}

	updateAnimation() {
		if(this._animationSprite !== null && this.visible) {
			this._animationSprite.update();
			if(!this._animationSprite.isPlaying()) {
				this.onAnimationComplete();
			}
		}
	}

	onAnimationComplete() {
		if(this.isLoop()) {
			this.restartAnimation();
		} else if(!this.isOnShow()) {
			this.destroyAnimation();
		}
	}

	restartAnimation() {
		if(this._animationSprite !== null && this._placeholder !== null && this._dataAnimation !== null) {
			this.destroyAnimation();
			this.createAnimationInternal(this._dataAnimation, this._placeholder);
		}
	}

	destroyAnimation() {
		this.removeChild(this._animationSprite);
		this._animationSprite.destroy();
		this._animationSprite = null;
	}

	onDisplayConditionsChanged(val) {
		super.onDisplayConditionsChanged(val);
		if(!this._destroyed) {
			if(val && (this.isOnShow() || this.isLoop())) {
				this.restartAnimation();
			}
		}
	}

	isOnShow() {
		return this._behavior === 1;
	}

	isLoop() {
		return this._behavior === 2;
	}
}

//=============================================================================
// * Scene_Map
//=============================================================================
class Scene_Map_ {
	isAnyButtonPressed() {
		return $.Scene_Map.isAnyButtonPressed.apply(this, arguments) || $gameUltraHUD.wasHUDButtonClicked();
	}
}

//=============================================================================
// * Game_BattlerBase
//=============================================================================
class Game_BattlerBase {
	buffIds_Ultra() {
		const ids = [];
		for (let i = 0; i < this._buffs.length; i++) {
			if (this._buffs[i] !== 0) {
				ids.push((this._buffs[i] - 1) * 8 + i);
			}
		}
		return ids;
	}

	buffNames_Ultra() {
		const ids = [];
		for (let i = 0; i < this._buffs.length; i++) {
			if (this._buffs[i] !== 0) {
				ids.push(this.buffText_Ultra(i));
			}
		}
		return ids;
	}

	buffText_Ultra(paramId) {
		return this.buffNumberText_Ultra(paramId) + "% " + TextManager.param(paramId);
	}

	buffNumberText_Ultra(paramId) {
		return String(this.paramBuffRate(paramId) * 100);
	}
}

//=============================================================================
// * Spriteset_Map
//=============================================================================
class Spriteset_Map {
	initialize() {
		this._playerSprite_ultra = null;
		this._followerSprites_ultra = [];
		this._eventSprites_ultra = [];
		$.Spriteset_Map.initialize.apply(this, arguments);
	}

	createCharacters() {
		$.Spriteset_Map.createCharacters.apply(this, arguments);
		this.setupCharacterSpriteReferences_ultra();
	}

	playerSprite_ultra() {
		return this._playerSprite_ultra;
	}

	followerSprites_ultra() {
		return this._followerSprites_ultra;
	}

	eventSprites_ultra() {
		return this._eventSprites_ultra;
	}

	resetCharacterSpriteReferences_ultra() {
		this._playerSprite_ultra = null;
		this._followerSprites_ultra = [];
		this._eventSprites_ultra = [];
	}

	setupCharacterSpriteReferences_ultra() {
		this.resetCharacterSpriteReferences_ultra();
		this.setupCharacterSpriteReferences_player_ultra();
		this.setupCharacterSpriteReferences_followers_ultra();
		this.setupCharacterSpriteReferences_events_ultra();
	}

	setupCharacterSpriteReferences_player_ultra() {
		this._playerSprite_ultra = this.findTargetSprite($gamePlayer);
	}

	setupCharacterSpriteReferences_followers_ultra() {
		const followers = $gamePlayer.followers().data();
		for(let i = 0; i < followers.length; i++) {
			this._followerSprites_ultra.push(this.findTargetSprite(followers[i]));
		}
	}

	setupCharacterSpriteReferences_events_ultra() {
		let events = $gameMap.events();
		for(let i = 0; i < events.length; i++) {
			const spr = this._characterSprites[i];
			if(spr.checkCharacter(events[i])) {
				this._eventSprites_ultra.push(spr);
			} else {
				this._eventSprites_ultra.push(this.findTargetSprite(events[i]));
			}
		}
	}
}

//=============================================================================
// * Plugin Commands
//=============================================================================

PluginManager.registerCommand("SRD_HUDMakerUltraPro", "Set Current HUD", function(params) {
	const hudName = String(params["HUD Name"]);
	$gameUltraHUD.setHUDByName(hudName);
});

PluginManager.registerCommand("SRD_HUDMakerUltraPro", "Reset HUD", function(params) {
	const hudType = String(params["HUD Type"]);
	let changed = false;
	switch(hudType) {
		case "Current": {
			changed = $gameUltraHUD.resetCurrentID();
			break;
		}
		case "Map": {
			changed = $gameUltraHUD.resetMapID() && !$gameParty.inBattle();
			break;
		}
		case "Battle": {
			changed = $gameUltraHUD.resetBattleID() && $gameParty.inBattle();
			break;
		}
	}
	if(changed) {
		$gameUltraHUD.refreshHUD();
	}
});

//=============================================================================
// * Plugin Exports
//=============================================================================
const exports = window;
exports.UltraDynamicCondition_CustomComponentExists        = UltraDynamicCondition_CustomComponentExists;
exports.UltraDynamicCondition_CustomComponent              = UltraDynamicCondition_CustomComponent;
exports.UltraDynamicValue_MathComponent                    = UltraDynamicValue_MathComponent;
exports.UltraDynamicValue_ListComponent                    = UltraDynamicValue_ListComponent;
exports.UltraDynamicList                                   = UltraDynamicList;
exports.UltraDynamicList_Numbers                           = UltraDynamicList_Numbers;
exports.UltraDynamicList_Variables                         = UltraDynamicList_Variables;
exports.UltraDynamicList_GroupData                         = UltraDynamicList_GroupData;
exports.UltraDynamicList_Items                             = UltraDynamicList_Items;
exports.UltraDynamicList_ActorOrEnemy                      = UltraDynamicList_ActorOrEnemy;
exports.UltraDynamicList_Actor                             = UltraDynamicList_Actor;
exports.UltraDynamicList_Enemy                             = UltraDynamicList_Enemy;
exports.UltraDynamicList_Combine                           = UltraDynamicList_Combine;
exports.UltraDynamicList_Code                              = UltraDynamicList_Code;
exports.Sprite_UltraHUDComponent_CustomComponent           = Sprite_UltraHUDComponent_CustomComponent;
exports.Sprite_UltraHUDComponent_CustomComponentCollection = Sprite_UltraHUDComponent_CustomComponentCollection;
exports.Sprite_UltraHUDComponent_AttachComponentCollection = Sprite_UltraHUDComponent_AttachComponentCollection;
exports.Sprite_UltraHUDComponent_Animation                 = Sprite_UltraHUDComponent_Animation;
exports.UltraHUDAddon_Base                                 = UltraHUDAddon_Base;
exports.UltraHUDAddon_ColorFilter                          = UltraHUDAddon_ColorFilter;
exports.UltraHUDAddon_Hover                                = UltraHUDAddon_Hover;
exports.UltraHUDAddon_Click                                = UltraHUDAddon_Click;
exports.UltraHUDAddon_CodeProperty                         = UltraHUDAddon_CodeProperty;
exports.UltraHUDAddon_CodeBehavior                         = UltraHUDAddon_CodeBehavior;

//=============================================================================
// * MergeClass
// *
// * Never stagnate. Never stagnate. Never stagnate.
//=============================================================================
function MergeClass(es6Class, name) {
	const className = name || es6Class.prototype.constructor.name;
	const classObj = window[className];
	if(classObj) {
		$[className] = $[className] || {};
		Object.getOwnPropertyNames(es6Class.prototype).forEach(function(name) {
			if(name === "constructor") return;
			if(classObj.prototype[name]) {
				$[className][name] = classObj.prototype[name];
			}
			classObj.prototype[name] = es6Class.prototype[name];
		});
	}
}

MergeClass(Game_UltraHUD);
MergeClass(HUDMakerUltraProcessConfiguration);
MergeClass(Stage_UltraHUDContainer);
MergeClass(Sprite_UltraHUD_,"Sprite_UltraHUD");
MergeClass(Sprite_UltraHUDComponent_, "Sprite_UltraHUDComponent");
MergeClass(UltraDynamicCondition_, "UltraDynamicCondition");
MergeClass(UltraDynamicText_, "UltraDynamicText");
MergeClass(UltraDynamicNumber_, "UltraDynamicNumber");
MergeClass(UltraHUDComponent_Animation);
MergeClass(Scene_Map_, "Scene_Map");
MergeClass(Game_BattlerBase);
MergeClass(Spriteset_Map);

})(SRD.HUDMakerUltraPro);
