"""Convert a downloaded Open5e v2 SRD 2024 response into RoundKeep's offline catalogue."""
import json,sys
raw=json.load(open(sys.argv[1]))
assert raw['next'] is None, 'Download every page before converting'
output=[]
for s in raw['results']:
 a=s['ability_scores']; r=s['resistances_and_immunities']
 creature={'Id':'creatures-'+s['key'],'Name':s['name'],'Source':'SRD 2024 · Open5e','Type':s['size']['name']+' '+s['type']['name']+', '+s['alignment'],'HP':{'Value':s['hit_points'],'Notes':s['hit_dice']},'AC':{'Value':s['armor_class'],'Notes':s['armor_detail']},'InitiativeModifier':s.get('initiative_bonus') if s.get('initiative_bonus') is not None else (a['dexterity']-10)//2,'Abilities':dict(zip(['Str','Dex','Con','Int','Wis','Cha'],[a[k] for k in ['strength','dexterity','constitution','intelligence','wisdom','charisma']])),'Speed':[f'{k} {v} {s["speed"].get("unit","feet")}' for k,v in s['speed'].items() if k not in ['unit','hover'] and v],'Challenge':str(s['challenge_rating']).removesuffix('.0'),'Languages':[s['languages']['as_string']],'Senses':[f'{k.replace("_range","")} {s[k]} ft.' for k in ['darkvision_range','blindsight_range','tremorsense_range','truesight_range'] if s.get(k)],'Traits':[{'Name':f['name'],'Content':f['desc']} for f in s['traits']],'Saves':[{'Name':k,'Modifier':v} for k,v in s.get('saving_throws',{}).items()],'Skills':[{'Name':k,'Modifier':v} for k,v in s.get('skill_bonuses',{}).items()]}
 for target,source in [('DamageVulnerabilities','damage_vulnerabilities'),('DamageResistances','damage_resistances'),('DamageImmunities','damage_immunities'),('ConditionImmunities','condition_immunities')]:creature[target]=[x['name'] for x in r[source]]
 for target,kind in [('Actions','ACTION'),('BonusActions','BONUS_ACTION'),('Reactions','REACTION'),('LegendaryActions','LEGENDARY_ACTION'),('MythicActions','MYTHIC_ACTION')]:
  creature[target]=[{'Name':f['name'],'Content':f['desc'],'Usage':json.dumps(f.get('usage_limits')) if f.get('usage_limits') else '', 'LegendaryCost':f.get('legendary_action_cost')} for f in sorted(s['actions'],key=lambda f:f.get('order_in_statblock') or 0) if f['action_type']==kind]
 output.append(creature)
json.dump(output,open('public/data/creatures.json','w'),ensure_ascii=False,separators=(',',':'))
print('Converted',len(output),'creatures')
