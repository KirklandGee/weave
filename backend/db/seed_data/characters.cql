// Shared characters (appear in both campaigns)
CREATE (:Character {id:'char-elira',  title:'Elira Moonshadow', type:'Character', level:3, class:'Ranger', markdown:'Wood-elf hunter haunted by prophetic dreams of a coming shadow. Quick with a bow and quicker to laugh—until the moon rises.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Character {id:'char-talia',  title:'Talia Stormborn',  type:'Character', level:3, class:'Sorcerer', markdown:'A scion of tempestuous magic, lightning flickers in her eyes when angered. Seeking the source of a storm tattoo that grows with each spell cast.', createdAt:datetime(), updatedAt:datetime()});

// Campaign-specific characters
CREATE (:Character {id:'char-dorgan', title:'Dorgan Ironfist', type:'Character', level:3, class:'Fighter',  markdown:'Dwarf veteran sporting a notched axe and an older, deeper grudge.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Character {id:'char-fenric', title:'Fenric Quickfoot',type:'Character', level:3, class:'Rogue',    markdown:'Halfling courier with a penchant for locks—especially other people’s.', createdAt:datetime(), updatedAt:datetime()});

CREATE (:Character {id:'char-magnus', title:'Magnus Thorne',   type:'Character', level:4, class:'Paladin',  markdown:'Dragon-born knight sworn to a creed of storm and steel.', createdAt:datetime(), updatedAt:datetime()});
CREATE (:Character {id:'char-kaelin', title:'Kaelin Nightsong',type:'Character', level:4, class:'Bard',     markdown:'Tiefling storyteller whose lute strings hide razor wire.', createdAt:datetime(), updatedAt:datetime()});