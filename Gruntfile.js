module.exports = function(grunt){

  grunt.initConfig({
    email: {
      dev: {
        options: {
          dir: '',
          emailJson: '',
          config: '',
          structure: '',
          variables: ''                  
        }
      }      
    }
  });

  grunt.registerTask('definePath', function(path){
      if(path){
        var dir = "Smiles/"+path+"/";
        grunt.option('dir', dir);   
        grunt.task.run('searchJson');
      }else{
        grunt.log.writeln("Insira o caminho da pasta no formato YYYYMMDD/JOB/VERSION");
      }     
  }); 

  grunt.registerTask('searchJson', function(){
      dir = grunt.option('dir');      
      if(grunt.file.exists(dir+'_src/email.json')){
        var emailJson = grunt.file.readJSON(dir+'_src/email.json');
        grunt.option('emailJson', emailJson);   
        grunt.task.run('setConfig');
      }else{
        grunt.log.writeln("Arquivo email.json não encontrado");
      }
  });

  grunt.registerTask('setConfig', function(){
    emailJson = grunt.option('emailJson');
    grunt.option('config', emailJson.config);
    grunt.option('structure', emailJson.structure);
    grunt.option('variables', emailJson.variables);    
    grunt.task.run('readJson');
  });  

  grunt.registerTask('readJson', function(){
    dir = grunt.option('dir'); 
    config = grunt.option('config'); 
    structure = grunt.option('structure');    
    variables = grunt.option('variables');
    var content_html = '';
    var content_dynamic = '';  
    var tj_html = '';
    var tj_dynamic = '';   

    for(var blocks in structure){      
      if(structure[blocks].type == 'banner'){
        block_html = grunt.file.read('templates/block/bloco_banner.html');      
      }else if(structure[blocks].type == 'texto'){
        block_html = grunt.file.read('templates/block/bloco_texto.html');      
      }else if(structure[blocks].type == 'naoPadrao'){
        block_html = grunt.file.read(dir+"_src/"+structure[blocks].file);                                  
      }else if(structure[blocks].type == 'espaco'){
        block_html = grunt.file.read('templates/block/bloco_espaco.html');      
      }else if(structure[blocks].type == 'header'){
        block_html = grunt.file.read('templates/block/bloco_header_'+structure[blocks].versao+'.html');      
      }else if(structure[blocks].type == 'slot'){
        block_html = grunt.file.read('templates/block/bloco_slot_'+structure[blocks].versao+'.html');            
      }else if(structure[blocks].type == 'tj'){
        block_html = grunt.file.read('templates/block/bloco_tj.html');           
      }

      for(var block in structure[blocks]){            
        block_html = block_html.replace("{{ "+block+" }}",structure[blocks][block]);            
      }

      if(structure[blocks].is_dynamic == 's'){
        block_dynamic = grunt.file.read('templates/block/bloco_slot_dynamic.html');
        block_dynamic = block_dynamic.replace("{{ filename }}",(structure[blocks].filename).toUpperCase());  

        for(var variable in variables){            
          block_html_file = block_html.replace("{{ "+variable+" }}",variables[variable].reference);
        }
        var base_slot = grunt.file.read("templates/base/base_slot.html");
        block_html_file = base_slot.replace("{{ slot_content }}",block_html_file); 
        grunt.file.write(dir+'slots/'+structure[blocks].filename+'.html', block_html_file);

        grunt.log.writeln("Arquivo "+dir+'slots/'+structure[blocks].filename+'.html'+" criado");
      }else{
        block_dynamic = block_html;
      }
      
      if(structure[blocks].is_tj == 's'){
        tj_html = tj_html + block_html;
        tj_dynamic = tj_dynamic + block_dynamic; 
      }else{
        content_html = content_html + block_html;
        content_dynamic = content_dynamic + block_dynamic; 
      }      
    }

    for(var variable in variables){
      content_html = content_html.replace("{{ "+variable+" }}",variables[variable].example);
      content_dynamic = content_dynamic.replace("{{ "+variable+" }}",variables[variable].reference);
    }

    var base_html = grunt.file.read("templates/base/"+config.base);
    var base_index = grunt.file.read("templates/base/"+config.baseIndex);
    base_html = base_html.replace("{{ snippet }}",config.snippet);
    base_index = base_index.replace("{{ snippet }}",config.snippet);

    disparo_content = base_html.replace("{{ email_content }}",content_dynamic); 
    disparo_content = disparo_content.replace("{{ tj_content }}",tj_dynamic); 
    index_contant = base_index.replace("{{ email_content }}",content_dynamic);          
    index_contant = index_contant.replace("{{ tj_content }}",tj_dynamic);          
    visualizacao_content = base_html.replace("{{ email_content }}",content_html);
    visualizacao_content = visualizacao_content.replace("{{ tj_content }}",tj_html); 

    grunt.file.write(dir+'visualizacao.html', visualizacao_content);
    grunt.file.write(dir+'disparo.html', disparo_content);
    grunt.file.write(dir+'index.html', index_contant);

    grunt.log.writeln("Arquivo "+dir+"visualizacao.html criado");
    grunt.log.writeln("Arquivo "+dir+"disparo.html criado");
    grunt.log.writeln("Arquivo "+dir+"index.html criado");
  });

}